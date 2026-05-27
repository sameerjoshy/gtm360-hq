import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase, fmt$, getCompanyName } from '../lib/supabase'
import { Mic, Send, Loader2, Calendar, Flag, TrendingUp, Target } from 'lucide-react'
import { useAppStore } from '../store'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toArr = (val) => {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'object') return Object.values(val)
  return []
}

const COMMAND_PILLS = ['/today', '/escalate', '/sync', '/capture', '/risks']

// ─── Sam's system prompt ─────────────────────────────────────────────────────
const SAM_SYSTEM = `You are Sam, Sameer Joshi's AI Chief of Staff at GTM360. You operate across all business functions: pipeline, content, finance, OKRs, and operations. Your job is to keep Sameer focused on the highest-leverage action each day, surface risks early, and synthesize signal from noise.

Style: Confident, direct, brief. No filler. Prioritize ruthlessly. When uncertain, say so — don't pad.

/today — Deliver the morning brief: (1) The one thing that will move the needle today, (2) pipeline urgencies requiring Sameer's attention, (3) content or meetings needing a decision, (4) OKR pulse, (5) Sam's flag (the one thing Sameer might miss that matters).

/escalate — List what needs to be escalated or decided right now, with context.
/sync — Give a 60-second state-of-the-business summary.
/capture — Help capture and file an observation, decision, or update.
/risks — Surface the top 3 risks to the business right now.

For general questions: answer directly with business context. No hedging.`

// ─── Streaming chat hook ──────────────────────────────────────────────────────
function useSamChat(brief, deals, okrs) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Morning, Sameer. Run /today for your brief, or ask me anything.",
    done: true,
  }])
  const [isStreaming, setStreaming] = useState(false)
  const abortRef = useRef(null)

  const buildContext = () => {
    const lines = []
    if (brief) {
      if (brief.one_thing) lines.push(`ONE THING: ${brief.one_thing}`)
      if (brief.sams_flag) lines.push(`SAM'S FLAG: ${brief.sams_flag}`)
    }
    if (deals.length > 0) {
      lines.push(`PIPELINE: ${deals.length} deals, $${Math.round(deals.reduce((s, d) => s + (d.amount || 0), 0) / 1000)}K total`)
    }
    return lines.length > 0 ? `\n\n[Context: ${lines.join(' | ')}]` : ''
  }

  const send = useCallback(async (userText) => {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    const hasKey = apiKey && apiKey !== 'your-anthropic-api-key-here'

    const history = [...messages, { role: 'user', content: userText + buildContext(), done: true }]
      .filter(m => m.content).map(({ role, content }) => ({ role, content }))

    setMessages(prev => [
      ...prev,
      { role: 'user', content: userText, done: true },
    ])

    if (!hasKey) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Add VITE_ANTHROPIC_API_KEY to .env.local to enable Sam.',
        done: true, isError: true,
      }])
      return
    }

    if (isStreaming) return
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '', done: false }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-7',
          max_tokens: 1500,
          stream: true,
          thinking: { type: 'adaptive' },
          system: SAM_SYSTEM,
          messages: history,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message || `HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const json = line.slice(6).trim()
          if (json === '[DONE]') continue
          try {
            const evt = JSON.parse(json)
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = {
                  ...copy[copy.length - 1],
                  content: copy[copy.length - 1].content + evt.delta.text,
                }
                return copy
              })
            }
          } catch { /* skip */ }
        }
      }
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { ...copy[copy.length - 1], done: true }
        return copy
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: `Error: ${err.message}`, done: true, isError: true }
          return copy
        })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming, messages, brief, deals])

  const stop = useCallback(() => abortRef.current?.abort(), [])
  return { messages, isStreaming, send, stop }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StreamCursor() {
  return <span className="inline-block w-[3px] h-[13px] bg-gtm-orange rounded-sm ml-0.5 align-middle animate-pulse" />
}

function BriefSection({ icon: Icon, label, children }) {
  if (!children) return null
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={10} className="text-text-mut" />
        <span className="text-xxs font-mono text-text-mut uppercase tracking-widest">{label}</span>
      </div>
      {children}
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function SamView() {
  const [brief, setBrief] = useState(null)
  const [okrs, setOkrs]   = useState([])
  const [input, setInput] = useState('')
  const chatEndRef         = useRef(null)
  const deals              = useAppStore(s => s.deals)
  const { messages, isStreaming, send, stop } = useSamChat(brief, deals, okrs)

  useEffect(() => {
    Promise.all([
      supabase.from('daily_brief').select('*').order('brief_date', { ascending: false }).limit(1),
      supabase.from('okr_tracker').select('*').order('objective_number').order('kr_number'),
    ]).then(([b, o]) => {
      setBrief(b.data?.[0] || null)
      setOkrs(o.data || [])
    })
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const objectives = [1, 2, 3].map(n => {
    const krs    = okrs.filter(k => k.objective_number === n)
    const target = krs.reduce((s, k) => s + (k.kr_target || 0), 0)
    const curr   = krs.reduce((s, k) => s + (k.kr_current || 0), 0)
    return {
      n,
      text: krs[0]?.objective_text || `Objective ${n}`,
      pct: target > 0 ? Math.round(curr / target * 100) : 0,
    }
  })

  const meetings    = toArr(brief?.meetings)
  const priorityAct = toArr(brief?.priority_actions)

  const handleSend = () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    send(text)
  }

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-bdr shrink-0">
        <div className="flex items-center gap-2">
          <Mic size={14} className="text-gtm-orange" />
          <span className="font-display text-lg tracking-wide">Sam</span>
          <span className="text-text-mut text-xs font-mono">— Chief of Staff</span>
        </div>
        <div className="flex-1" />
        {isStreaming && <Loader2 size={13} className="text-gtm-orange animate-spin" />}
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Structured brief sidebar */}
        <div className="w-[260px] shrink-0 border-r border-bdr overflow-y-auto p-4 space-y-4 bg-bg-s1">
          {brief ? (
            <>
              <BriefSection icon={Flag} label="One Thing">
                <p className="text-xs text-text-sec leading-relaxed bg-bg-s2 border border-bdr rounded-lg px-3 py-2">
                  {brief.one_thing}
                </p>
              </BriefSection>

              {meetings.length > 0 && (
                <BriefSection icon={Calendar} label="Today's Meetings">
                  <div className="space-y-1.5">
                    {meetings.map((m, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="text-gtm-orange font-mono text-xxs shrink-0 mt-0.5">{m.time || '—'}</span>
                        <span className="text-text-sec leading-tight">{m.title || String(m)}</span>
                      </div>
                    ))}
                  </div>
                </BriefSection>
              )}

              {priorityAct.length > 0 && (
                <BriefSection icon={TrendingUp} label="Priority Actions">
                  <div className="space-y-1">
                    {priorityAct.slice(0, 4).map((a, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="text-gtm-orange shrink-0 mt-0.5">›</span>
                        <span className="text-text-sec leading-tight">{String(a)}</span>
                      </div>
                    ))}
                  </div>
                </BriefSection>
              )}

              <BriefSection icon={Target} label="OKR Health">
                <div className="space-y-2">
                  {objectives.map(o => (
                    <div key={o.n}>
                      <div className="flex justify-between text-xxs font-mono mb-1">
                        <span className="text-text-mut truncate max-w-[160px]">{o.text.slice(0, 28)}{o.text.length > 28 ? '…' : ''}</span>
                        <span className={o.pct === 0 ? 'text-danger' : o.pct < 50 ? 'text-warn' : 'text-ok'}>{o.pct}%</span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${o.pct}%`,
                            background: o.pct === 0 ? '#FF1744' : o.pct < 50 ? '#FFD600' : '#00E676',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </BriefSection>

              {brief.sams_flag && (
                <BriefSection icon={Flag} label="Sam's Flag">
                  <p className="text-xs text-danger leading-relaxed border-l-2 border-danger pl-2">
                    {brief.sams_flag}
                  </p>
                </BriefSection>
              )}

              {/* Pipeline quick view */}
              {deals.length > 0 && (
                <BriefSection icon={TrendingUp} label="Pipeline">
                  <div className="space-y-1">
                    {deals.slice(0, 5).map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-xxs font-mono">
                        <span className="text-text-sec">{getCompanyName(d)}</span>
                        <span className="text-text-mut">{fmt$(d.amount)}</span>
                      </div>
                    ))}
                  </div>
                </BriefSection>
              )}
            </>
          ) : (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-2 bg-bg-s2 rounded animate-pulse w-1/3" />
                  <div className="h-8 bg-bg-s2 rounded animate-pulse" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, i) => {
              const isLast = i === messages.length - 1
              return (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-gtm-orange/20 border border-gtm-orange/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Mic size={12} className="text-gtm-orange" />
                    </div>
                  )}
                  <div className={`max-w-[75%] text-sm leading-relaxed px-3 py-2.5 rounded-xl whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-gtm-orange/10 text-text-pri border border-gtm-orange/20'
                      : msg.isError
                        ? 'bg-danger/5 border border-danger/20 text-danger'
                        : 'bg-bg-s2 text-text-sec border border-bdr'
                  }`}>
                    {msg.content}
                    {msg.role === 'assistant' && isLast && !msg.done && <StreamCursor />}
                  </div>
                </div>
              )
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-bdr p-4 space-y-2.5 shrink-0">
            <div className="flex gap-1.5 flex-wrap">
              {COMMAND_PILLS.map(p => (
                <button
                  key={p}
                  onClick={() => setInput(p)}
                  className="text-xxs font-mono bg-bg-s2 border border-bdr text-text-sec px-2 py-1 rounded hover:border-gtm-orange/40 hover:text-gtm-orange transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Type a command or ask Sam…"
                className="input-base"
                disabled={isStreaming}
              />
              {isStreaming ? (
                <button onClick={stop} className="btn-ghost px-3 border border-danger/30 text-danger hover:bg-danger/10">
                  <div className="w-2.5 h-2.5 bg-danger rounded-sm" />
                </button>
              ) : (
                <button onClick={handleSend} className="btn-primary px-3" disabled={!input.trim()}>
                  <Send size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

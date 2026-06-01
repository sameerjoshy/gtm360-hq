import { useEffect, useState, useRef, useCallback } from 'react'
import { callAI } from '../lib/ai'
import { supabase } from '../lib/supabase'
import {
  Megaphone, Plus, CheckCircle, RotateCcw, Send,
  Loader2, Copy, ExternalLink, FileText, Zap,
} from 'lucide-react'

// ─── Status config ────────────────────────────────────────────────────────────
const STATUSES = ['All', 'raw', 'drafting', 'review', 'approved', 'published']

const STATUS_BADGE = {
  raw:       'badge-muted',
  drafting:  'badge-warn',
  review:    'badge-orange',
  approved:  'badge-green',
  published: 'badge-green',
}

// ─── Andy persona ─────────────────────────────────────────────────────────────
const ANDY_SYSTEM = `You are Andy, the fractional CMO for GTM360. You specialize in B2B SaaS content strategy, thought leadership, and demand generation. You help founders turn raw observations into sharp LinkedIn posts that build authority and drive pipeline.

Commands:
/post [observation] — Write a LinkedIn post (150-250 words). Hook first (never start with "I"). Short paragraphs. 1-2 specific insights. End with a provocative question or clear takeaway. Max 3 hashtags. Sound like a sharp founder, not a LinkedIn influencer.
/email [context] — Write a cold outreach email. Subject line + body. Personalized, brief, clear ask. No fluff.
/sequence [goal] — Write a 5-step LinkedIn + email outreach sequence. Each message is standalone. Day 1, 3, 7, 14, 21. Specify the channel and exact hook for each step.
/capture [observation] — Structure a raw observation into a content brief: core insight, target audience, format recommendation, 3 potential angles. Quick, opinionated.
/repurpose — Transform the current post into a Twitter/X thread or short-form email nurture sequence.

For posts: Use line breaks. Make the first line impossible to scroll past. No fluff. No "In today's world..." openers.`

function buildPrompt(input, selected) {
  const base = input.trim()
  if (base.startsWith('/repurpose') && selected?.draft) {
    return `${base}\n\nOriginal post:\n${selected.draft}`
  }
  return base
}

// ─── Streaming chat hook ───────────────────────────────────────────────────────
function useAndyChat() {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Ready. Drop an observation or run /post, /email, /repurpose.",
    done: true,
  }])
  const [isStreaming, setStreaming] = useState(false)

  const send = useCallback(async (userText) => {
    if (isStreaming) return

    const history = messages
      .filter(m => m.content && !m.isError)
      .map(m => `${m.role === 'user' ? 'User' : 'Andy'}: ${m.content}`)
      .join('\n')
    const fullPrompt = (history ? history + '\nUser: ' : '') + userText

    setMessages(prev => [
      ...prev,
      { role: 'user', content: userText, done: true },
      { role: 'assistant', content: '', done: false },
    ])
    setStreaming(true)

    try {
      const response = await callAI(fullPrompt, ANDY_SYSTEM, 1500)
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { ...copy[copy.length - 1], content: response, done: true }
        return copy
      })
    } catch (err) {
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { ...copy[copy.length - 1], content: `Error: ${err.message}`, done: true, isError: true }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }, [isStreaming, messages])

  const stop = useCallback(() => setStreaming(false), [])

  return { messages, isStreaming, send, stop }
}

// ─── Components ───────────────────────────────────────────────────────────────
function StreamCursor() {
  return <span className="inline-block w-[3px] h-[13px] bg-gtm-orange rounded-sm ml-0.5 align-middle animate-pulse" />
}

function ChatBubble({ msg, isLast, isStreaming, onAddToQueue }) {
  const isAssistant = msg.role === 'assistant'
  const hasPost = isAssistant && msg.done && msg.content.length > 100

  return (
    <div className={`flex gap-2 ${isAssistant ? '' : 'justify-end'}`}>
      {isAssistant && (
        <div className="w-6 h-6 rounded-full bg-gtm-orange/20 border border-gtm-orange/40 flex items-center justify-center shrink-0 mt-0.5">
          <Megaphone size={10} className="text-gtm-orange" />
        </div>
      )}
      <div className="max-w-[90%] space-y-1.5">
        <div className={`text-xs leading-relaxed px-2.5 py-2 rounded-lg whitespace-pre-wrap ${
          msg.role === 'user'
            ? 'bg-gtm-orange/10 border border-gtm-orange/20 text-text-pri'
            : msg.isError
              ? 'bg-danger/5 border border-danger/20 text-danger'
              : 'bg-bg-s2 border border-bdr text-text-sec'
        }`}>
          {msg.content}
          {isAssistant && isLast && !msg.done && <StreamCursor />}
        </div>
        {/* Action strip after a completed, substantial response */}
        {hasPost && isLast && (
          <div className="flex gap-1.5 pl-1">
            <button
              onClick={() => navigator.clipboard?.writeText(msg.content)}
              className="text-xxs font-mono text-text-mut hover:text-text-sec flex items-center gap-1 transition-colors"
            >
              <Copy size={9} /> Copy
            </button>
            {onAddToQueue && (
              <button
                onClick={() => onAddToQueue(msg.content)}
                className="text-xxs font-mono text-gtm-orange hover:text-gtm-amber flex items-center gap-1 transition-colors"
              >
                <Plus size={9} /> Add to Queue
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function AndyView() {
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('All')
  const [selected, setSelected]   = useState(null)
  const [input, setInput]         = useState('')
  const chatEndRef                = useRef(null)
  const { messages, isStreaming, send, stop } = useAndyChat()

  useEffect(() => {
    supabase
      .from('content_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = data || []
        setItems(rows)
        setSelected(rows[0] || null)
        setLoading(false)
      })
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const filtered = tab === 'All' ? items : items.filter(i => i.status === tab)

  const updateStatus = async (id, status) => {
    await supabase.from('content_queue').update({ status }).eq('id', id)
    setItems(prev => prev.map(x => x.id === id ? { ...x, status } : x))
    if (selected?.id === id) setSelected(s => ({ ...s, status }))
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    send(buildPrompt(text, selected), selected)
  }

  const handleAddToQueue = async (content) => {
    const { data } = await supabase
      .from('content_queue')
      .insert({ draft: content, status: 'review', channel: 'LinkedIn', post_format: 'post' })
      .select()
      .single()
    if (data) {
      setItems(prev => [data, ...prev])
      setSelected(data)
    }
  }

  const tabCount = (s) => s === 'All' ? items.length : items.filter(i => i.status === s).length

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-bdr shrink-0">
        <div className="flex items-center gap-2">
          <Megaphone size={14} className="text-gtm-orange" />
          <span className="font-display text-lg tracking-wide">Andy</span>
          <span className="text-text-mut text-xs font-mono">— CMO</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setInput('/post ')}
          className="btn-primary text-xs flex items-center gap-1.5"
        >
          <Plus size={11} /> New Post
        </button>
      </div>

      {/* ── Status tabs ── */}
      <div className="flex gap-0 border-b border-bdr px-5 shrink-0">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`px-3 py-2 text-xs font-mono border-b-2 transition-colors ${
              tab === s
                ? 'border-gtm-orange text-gtm-orange'
                : 'border-transparent text-text-mut hover:text-text-sec'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-1.5 text-xxs opacity-60">{tabCount(s)}</span>
          </button>
        ))}
      </div>

      {/* ── Content queue table ── */}
      <div className="overflow-auto border-b border-bdr shrink-0" style={{ maxHeight: '38%' }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-bg-s1 z-10">
            <tr className="border-b border-bdr">
              {['Observation / Draft', 'Format', 'Channel', 'Status', 'QC'].map(h => (
                <th key={h} className="text-left px-4 py-2 text-text-mut font-mono font-normal text-xxs uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-bdr">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}>
                  {[...Array(5)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-2.5 bg-bg-s2 rounded animate-pulse" style={{ width: `${[70, 40, 40, 40, 30][j]}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-mut text-xs">
                  No items in this stage
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className={`cursor-pointer hover:bg-bg-s2 transition-colors ${
                    selected?.id === item.id ? 'bg-bg-s2 border-l-2 border-l-gtm-orange' : 'border-l-2 border-l-transparent'
                  }`}
                >
                  <td className="px-4 py-2.5 text-text-pri max-w-[320px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="truncate text-xs">
                        {(item.raw_observation || item.draft || '—').slice(0, 80)}
                        {(item.raw_observation || item.draft || '').length > 80 ? '…' : ''}
                      </div>
                      {item.observation_source === 'Aria' && (
                        <span className="text-xxs font-mono px-1 py-0.5 rounded bg-gtm-orange/10 text-gtm-orange shrink-0">
                          via Aria
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-text-sec whitespace-nowrap">{item.post_format || '—'}</td>
                  <td className="px-4 py-2.5 text-text-sec whitespace-nowrap">{item.channel || '—'}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={STATUS_BADGE[item.status] || 'badge-muted'}>{item.status}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-text-sec whitespace-nowrap">
                    {item.qc_score ? `${item.qc_score}/10` : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Bottom: Editor + Andy Chat ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Content editor */}
        <div className="flex-1 overflow-y-auto p-5 border-r border-bdr space-y-4">
          {selected ? (
            <>
              {/* Raw observation */}
              {selected.raw_observation && (
                <div>
                  <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-1.5">
                    Raw Observation
                  </div>
                  <p className="text-xs text-text-sec leading-relaxed bg-bg-s2 rounded-lg p-3 border border-bdr">
                    {selected.raw_observation}
                  </p>
                </div>
              )}

              {/* Draft */}
              {selected.draft && (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xxs font-mono text-text-mut uppercase tracking-widest">Draft</span>
                    <span className={STATUS_BADGE[selected.status] || 'badge-muted'}>{selected.status}</span>
                    {selected.channel && (
                      <span className="badge-muted ml-auto flex items-center gap-1">
                        <ExternalLink size={9} />
                        {selected.channel}
                      </span>
                    )}
                  </div>
                  <div className="bg-bg-s2 border border-bdr rounded-lg p-4">
                    <p className="text-sm text-text-pri leading-relaxed whitespace-pre-wrap">{selected.draft}</p>
                  </div>
                </div>
              )}

              {/* QC */}
              {selected.qc_score && (
                <div>
                  <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-1.5 flex items-center gap-2">
                    QC Score
                    <span className="text-gtm-orange font-mono">{selected.qc_score}/10</span>
                  </div>
                  <p className="text-xs text-text-sec leading-relaxed">{selected.qc_notes}</p>
                </div>
              )}

              {/* Actions */}
              {selected.status === 'review' && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => updateStatus(selected.id, 'approved')}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    <CheckCircle size={11} /> Approve
                  </button>
                  <button
                    onClick={() => { setInput('/repurpose'); }}
                    className="btn-ghost text-xs border border-bdr flex items-center gap-1.5"
                  >
                    <Zap size={11} /> Repurpose
                  </button>
                  <button
                    onClick={() => updateStatus(selected.id, 'drafting')}
                    className="btn-ghost text-xs border border-bdr flex items-center gap-1.5"
                  >
                    <RotateCcw size={11} /> Redraft
                  </button>
                </div>
              )}

              {selected.status === 'approved' && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => updateStatus(selected.id, 'published')}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    <ExternalLink size={11} /> Mark Published
                  </button>
                </div>
              )}

              {!selected.raw_observation && !selected.draft && (
                <div className="flex items-center justify-center h-24 text-text-mut text-xs">
                  No content yet — ask Andy to draft something
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
              <FileText size={24} className="text-text-mut" />
              <div className="text-sm text-text-mut">Select a queue item to review</div>
            </div>
          )}
        </div>

        {/* Andy chat */}
        <div className="w-[300px] shrink-0 flex flex-col bg-bg-base border-l border-bdr">
          {/* Chat header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-bdr shrink-0">
            <div className="w-5 h-5 rounded-full bg-gtm-orange/20 border border-gtm-orange/40 flex items-center justify-center">
              <Megaphone size={9} className="text-gtm-orange" />
            </div>
            <span className="text-xs font-mono text-text-sec">Andy — CMO</span>
            {isStreaming && <Loader2 size={11} className="ml-auto text-gtm-orange animate-spin" />}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <ChatBubble
                key={i}
                msg={msg}
                isLast={i === messages.length - 1}
                isStreaming={isStreaming}
                onAddToQueue={handleAddToQueue}
              />
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-bdr p-2 space-y-1.5 shrink-0">
            {/* Quick commands */}
            <div className="flex gap-1 flex-wrap">
              {['/post', '/email', '/sequence', '/capture', '/repurpose'].map(p => (
                <button
                  key={p}
                  onClick={() => setInput(p + ' ')}
                  className="text-xxs font-mono bg-bg-s2 border border-bdr text-text-sec px-1.5 py-0.5 rounded hover:border-gtm-orange/40 hover:text-gtm-orange transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask Andy…"
                className="input-base text-xs py-1.5"
                disabled={isStreaming}
              />
              {isStreaming ? (
                <button onClick={stop} className="btn-ghost px-2 border border-danger/30 text-danger hover:bg-danger/10">
                  <div className="w-2 h-2 bg-danger rounded-sm" />
                </button>
              ) : (
                <button onClick={handleSend} className="btn-primary px-2" disabled={!input.trim()}>
                  <Send size={11} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

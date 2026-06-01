import { useEffect, useState, useCallback } from 'react'
import { callAI } from '../lib/ai'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store'
import { countMeetingsThisWeek } from '../lib/memo'
import { fetchCrmHealthSummary, healthScore, scoreColor } from '../lib/cleo'
import { Settings2, Send, Loader2, Circle, Zap, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'

// ─── Ola system prompt ─────────────────────────────────────────────────────────
const OLA_SYSTEM = `You are Ola, the fractional COO for GTM360. You manage OKR tracking, system health, automation operations, and revenue operations infrastructure. You keep the GTM360 OS running efficiently and flag operational risks early.

GTM360 context:
• 8 AI agents: Sam (CoS), Rex (CRO), Andy (CMO), Finn (CFO), Ola (COO), Aria (Trend Researcher), Oz (Outreach Execution), Memo (Meeting Intel)
• Pipeline: HubSpot → Supabase sync
• Content: Raw observations → drafted posts → published. Aria feeds content_queue weekly.
• Finance: Invoice tracking, retainer management
• OKR tracking: 3 objectives, 9 KRs, Q2 2026
• Aria: monitors Reddit + web via Claude web_search. Runs Monday 7:00 AM IST. Writes to trend_reports table and content_queue (status: raw, source: Aria).
• Oz: Outreach execution agent. Generates 5-touch sequences from Rex intel. Human gate: nothing sends without explicit approval in the Outreach view.
• Memo: Meeting Intel agent. Analyzes call transcripts and extracts commitments, buying signals, objections, next steps, stage recommendations, follow-up email drafts, CRM notes, and Sam brief updates. Human gate: approve before acting on any output.

/okr — Full OKR dashboard with status, velocity, and recommendations
/health — System health: agents, automations, integrations, data quality
/tools — GTM360 tech stack review and optimization recommendations
/automate — Automation opportunities or current automation status
/weekly — Weekly operations summary

Be operational and specific. Flag blockers. Give clear next actions.`

const AUTOMATIONS = [
  { name: 'HubSpot → Pipeline Sync', status: 'ok',   time: '6:00 AM',     freq: 'daily'  },
  { name: 'Stale Deal Checker',       status: 'ok',   time: '6:15 AM',     freq: 'daily'  },
  { name: 'Sam Morning Brief',        status: 'ok',   time: '6:30 AM',     freq: 'daily'  },
  { name: 'OKR Pulse',               status: 'ok',   time: '6:30 AM',     freq: 'daily'  },
  { name: 'Invoice Monitor',          status: 'warn', time: 'Mon 6:45 AM', freq: 'weekly' },
  { name: 'Aria Trend Research',      status: 'ok',   time: 'Mon 7:00 AM', freq: 'weekly' },
  { name: 'Content QC',              status: 'ok',   time: 'on demand',   freq: 'manual' },
]

// ─── Streaming chat hook ──────────────────────────────────────────────────────
function useOlaChat(okrs, deals) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "System health nominal. All agents operational. Run /health for full report.",
    done: true,
  }])
  const [isStreaming, setStreaming] = useState(false)

  const buildContext = useCallback(() => {
    const objectives = [1, 2, 3].map(n => {
      const krs = okrs.filter(k => k.objective_number === n)
      const target = krs.reduce((s, k) => s + Number(k.kr_target || 0), 0)
      const curr   = krs.reduce((s, k) => s + Number(k.kr_current || 0), 0)
      const pct    = target > 0 ? Math.round(curr / target * 100) : 0
      return `O${n}: ${pct}%`
    })
    return `\n\n[Context: ${objectives.join(' | ')} | Pipeline: ${deals.length} deals | Agents: 5 live]`
  }, [okrs, deals])

  const send = useCallback(async (userText) => {
    if (isStreaming) return

    const history = messages
      .filter(m => m.content && !m.isError)
      .map(m => `${m.role === 'user' ? 'User' : 'Ola'}: ${m.content}`)
      .join('\n')
    const fullPrompt = (history ? history + '\nUser: ' : '') + userText + buildContext()

    setMessages(prev => [
      ...prev,
      { role: 'user', content: userText, done: true },
      { role: 'assistant', content: '', done: false },
    ])
    setStreaming(true)

    try {
      const response = await callAI(fullPrompt, OLA_SYSTEM, 1500)
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
  }, [isStreaming, messages, buildContext])

  const stop = useCallback(() => setStreaming(false), [])
  return { messages, isStreaming, send, stop }
}

// ─── Subcomponents ────────────────────────────────────────────────────────────
function StreamCursor() {
  return <span className="inline-block w-[3px] h-[13px] bg-gtm-orange rounded-sm ml-0.5 align-middle animate-pulse" />
}

function StatusDot({ status }) {
  const map = {
    ok:   'fill-ok text-ok',
    warn: 'fill-warn text-warn',
    err:  'fill-danger text-danger',
  }
  return <Circle size={7} className={`${map[status] || map.ok} shrink-0`} />
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function OlaView() {
  const [okrs, setOkrs]             = useState([])
  const [input, setInput]           = useState('')
  const [trendReport, setTrendReport] = useState(null)
  const [outreachStats, setOutreachStats] = useState(null)
  const [memoCount, setMemoCount]   = useState(null)
  const [crmHealth, setCrmHealth]   = useState(null)
  const navigate = useNavigate()
  const chatEndRef                  = useRef(null)
  const deals                       = useAppStore(s => s.deals)
  const lastRefresh                 = useAppStore(s => s.lastRefresh)
  const { messages, isStreaming, send, stop } = useOlaChat(okrs, deals)

  useEffect(() => {
    supabase
      .from('okr_tracker')
      .select('*')
      .order('objective_number')
      .order('kr_number')
      .then(({ data }) => setOkrs(data || []))
  }, [])

  useEffect(() => {
    supabase
      .from('trend_reports')
      .select('week_of, emerging, crowded, gaps, raw_observations, generated_at')
      .order('week_of', { ascending: false })
      .limit(1)
      .then(({ data }) => setTrendReport(data?.[0] || null))
  }, [])

  useEffect(() => {
    supabase
      .from('outreach_queue')
      .select('status, company_name')
      .then(({ data }) => {
        if (!data) return
        const rows = data || []
        setOutreachStats({
          total:    rows.length,
          draft:    rows.filter(r => r.status === 'draft').length,
          approved: rows.filter(r => r.status === 'approved').length,
          sent:     rows.filter(r => r.status === 'sent').length,
          replied:  rows.filter(r => r.status === 'replied').length,
          companies: [...new Set(rows.map(r => r.company_name))].length,
        })
      })
  }, [])

  useEffect(() => {
    countMeetingsThisWeek().then(setMemoCount)
    fetchCrmHealthSummary().then(setCrmHealth)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const objectives = [...new Set(okrs.map(k => k.objective_number))].map(n => ({
    n,
    text: okrs.find(k => k.objective_number === n)?.objective_text || `Objective ${n}`,
    krs:  okrs.filter(k => k.objective_number === n),
  }))

  const objStatus = (o) => {
    const target = o.krs.reduce((s, k) => s + Number(k.kr_target || 1), 0)
    const curr   = o.krs.reduce((s, k) => s + Number(k.kr_current || 0), 0)
    const pct    = target > 0 ? curr / target : 0
    if (pct === 0)   return { label: 'Off Track', color: 'text-danger',      bar: '#EF4444', pct: 0   }
    if (pct < 0.4)  return { label: 'At Risk',   color: 'text-warn',        bar: '#D97706', pct: Math.round(pct * 100) }
    if (pct < 0.75) return { label: 'On Track',  color: 'text-gtm-orange',  bar: '#FF4D00', pct: Math.round(pct * 100) }
    return               { label: 'Strong',     color: 'text-ok',          bar: '#059669', pct: Math.round(pct * 100) }
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    send(text)
  }

  const syncTime = lastRefresh
    ? lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '6:30 AM'

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-bdr shrink-0">
        <div className="flex items-center gap-2">
          <Settings2 size={14} className="text-gtm-orange" />
          <span className="font-display text-lg tracking-wide">Ola</span>
          <span className="text-text-mut text-xs font-mono">— COO</span>
        </div>
        <div className="flex-1" />
        <span className="text-xxs font-mono text-text-mut">last sync {syncTime}</span>
        {isStreaming && <Loader2 size={13} className="text-gtm-orange animate-spin" />}
      </div>

      {/* OKR Dashboard strip */}
      <div className="border-b border-bdr px-5 py-4 shrink-0">
        <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-3">OKR Dashboard — Q2 2026</div>
        <div className="space-y-4">
          {okrs.length === 0 ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="h-3 bg-bg-s2 rounded w-2/3" />
                <div className="h-1.5 bg-bg-s2 rounded" />
              </div>
            ))
          ) : (
            objectives.map(o => {
              const st = objStatus(o)
              return (
                <div key={o.n}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xxs font-mono text-text-mut">O{o.n}</span>
                    <span className="text-xs text-text-pri font-medium flex-1 truncate">{o.text}</span>
                    <span className={`text-xxs font-mono ${st.color}`}>{st.label}</span>
                    <span className="text-xxs font-mono text-text-sec w-8 text-right">{st.pct}%</span>
                  </div>
                  <div className="space-y-1.5 pl-5">
                    {o.krs.map((kr, i) => {
                      const pct = kr.kr_target > 0
                        ? Math.min(100, Math.round((Number(kr.kr_current) / Number(kr.kr_target)) * 100))
                        : 0
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xxs text-text-sec w-52 shrink-0 truncate font-mono">
                            KR{kr.kr_number} {kr.kr_text}
                          </span>
                          <div className="progress-track flex-1">
                            <div className="progress-fill" style={{ width: `${pct}%`, background: st.bar }} />
                          </div>
                          <span className="text-xxs font-mono text-text-mut w-16 text-right shrink-0">
                            {/brief|daily/i.test(kr.kr_text)
                              ? `${kr.kr_current} sessions`
                              : `${kr.kr_current}/${kr.kr_target}`}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Health + Chat */}
      <div className="flex flex-1 overflow-hidden">

        {/* System health panel */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 border-r border-bdr">

          {/* Agent status */}
          <div>
            <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-2">Agents</div>
            <div className="space-y-1.5">
              {[
                { name: 'Sam',  role: 'Chief of Staff',   status: 'ok' },
                { name: 'Rex',  role: 'CRO',              status: 'ok' },
                { name: 'Andy', role: 'CMO',              status: 'ok' },
                { name: 'Finn', role: 'CFO',              status: 'ok' },
                { name: 'Ola',  role: 'COO',              status: 'ok' },
                { name: 'Aria', role: 'Trend Researcher', status: 'ok' },
                { name: 'Oz',   role: 'Outreach',         status: 'ok' },
                { name: 'Memo', role: 'Meeting Intel',    status: 'ok' },
              ].map(a => (
                <div key={a.name} className="flex items-center gap-2.5 text-xs">
                  <StatusDot status={a.status} />
                  <span className="text-text-sec">{a.name}</span>
                  <span className="text-xxs text-text-mut font-mono">— {a.role}</span>
                  <span className="ml-auto text-xxs font-mono text-ok">
                    {a.name === 'Memo' && memoCount !== null
                      ? `${memoCount} meeting${memoCount !== 1 ? 's' : ''} this week`
                      : 'Live'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Automations */}
          <div>
            <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-2">Automations</div>
            <div className="space-y-1.5">
              {AUTOMATIONS.map(a => (
                <div key={a.name} className="flex items-center gap-2.5 text-xs">
                  <StatusDot status={a.status} />
                  <span className="text-text-sec flex-1">{a.name}</span>
                  <span className="text-xxs font-mono text-text-mut">{a.time}</span>
                  {a.status === 'warn' && (
                    <AlertTriangle size={10} className="text-warn shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* System status */}
          <div>
            <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-2">System Status</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Errors Open',   '0',     'text-ok',         CheckCircle],
                ['Supabase',      'Live',   'text-ok',         Circle     ],
                ['HubSpot Sync',  'Live',   'text-ok',         Circle     ],
                ['API Keys',      '2 active', 'text-ok',        CheckCircle],
              ].map(([label, val, color, Icon]) => (
                <div key={label} className="card px-3 py-2 flex items-center gap-2">
                  <Icon size={10} className={`${color} shrink-0`} />
                  <div>
                    <div className={`text-xs font-mono ${color}`}>{val}</div>
                    <div className="text-xxs text-text-mut">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tech stack */}
          <div>
            <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-2">Tech Stack</div>
            <div className="space-y-1 text-xs font-mono">
              {[
                ['CRM',      'HubSpot',              'Sales'],
                ['DB',       'Supabase (Postgres)',   'Data'],
                ['AI',       'Claude Opus 4.7',       'Agents'],
                ['Intel',    'Apollo.io',             'People data'],
                ['Trends',   'Reddit + web_search',   'Aria signals'],
                ['Frontend', 'React + Vite',          'HQ Dashboard'],
                ['Hosting',  'Cloudflare Pages',      'Deploy'],
              ].map(([cat, tool, use]) => (
                <div key={cat} className="flex gap-2">
                  <span className="badge-muted w-16 text-center">{cat}</span>
                  <span className="text-text-sec flex-1">{tool}</span>
                  <span className="text-text-mut text-xxs">{use}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cleo — CRM Health */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xxs font-mono text-text-mut uppercase tracking-widest">Cleo — CRM Health</div>
              <button
                onClick={() => navigate('/cleanup')}
                className="text-xxs font-mono text-gtm-orange hover:text-gtm-orange/80 transition-colors"
              >
                View Full Report →
              </button>
            </div>
            {crmHealth ? (
              <div className="card px-3 py-2.5 flex items-center gap-4">
                <div className={`font-display text-2xl leading-none ${scoreColor(crmHealth.score)}`}>
                  {crmHealth.score}%
                </div>
                <div className="flex-1">
                  <div className="text-xs text-text-sec">
                    {crmHealth.issuesFound === 0
                      ? 'All records clean'
                      : `${crmHealth.issuesFound} issues found`}
                  </div>
                  {crmHealth.criticalCount > 0 && (
                    <div className="text-xxs font-mono text-danger mt-0.5">
                      {crmHealth.criticalCount} critical
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-text-mut font-mono">
                No scan yet — click Run Manual Scan in CRM Quality
              </div>
            )}
          </div>

          {/* Oz Outreach Monitor */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Send size={10} className="text-info" />
              <div className="text-xxs font-mono text-text-mut uppercase tracking-widest">Oz — Outreach Queue</div>
            </div>
            {outreachStats ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="badge-muted text-xxs">{outreachStats.draft} draft</span>
                  <span className="badge-green text-xxs">{outreachStats.approved} approved</span>
                  <span className="badge-indigo text-xxs">{outreachStats.sent} sent</span>
                  {outreachStats.replied > 0 && (
                    <span className="badge-orange text-xxs">{outreachStats.replied} replied</span>
                  )}
                </div>
                <div className="text-xxs text-text-sec font-mono">
                  {outreachStats.total} touches across {outreachStats.companies} {outreachStats.companies === 1 ? 'company' : 'companies'}
                </div>
                {outreachStats.approved > 0 && (
                  <div className="text-xxs text-warn font-mono">
                    ▸ {outreachStats.approved} touch{outreachStats.approved !== 1 ? 'es' : ''} awaiting send
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xxs text-text-mut font-mono leading-relaxed">
                No outreach sequences yet.<br />
                Run ⚡ Intel on a Rex deal → 📤 Create Outreach.
              </div>
            )}
          </div>

          {/* Aria Trend Intel */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp size={10} className="text-gtm-orange" />
              <div className="text-xxs font-mono text-text-mut uppercase tracking-widest">Aria Intel — Latest Report</div>
            </div>
            {trendReport ? (() => {
              const emerging = Array.isArray(trendReport.emerging)         ? trendReport.emerging         : []
              const crowded  = Array.isArray(trendReport.crowded)          ? trendReport.crowded          : []
              const gaps     = Array.isArray(trendReport.gaps)             ? trendReport.gaps             : []
              const obs      = Array.isArray(trendReport.raw_observations) ? trendReport.raw_observations : []
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="badge-green text-xxs">{emerging.length} emerging</span>
                    <span className="badge-warn text-xxs">{crowded.length} crowded</span>
                    <span className="badge-muted text-xxs">{gaps.length} gaps</span>
                    <span className="badge-orange text-xxs">{obs.length} obs</span>
                  </div>
                  {emerging[0] && (
                    <div className="text-xxs text-text-sec font-mono leading-relaxed">
                      ▸ {emerging[0].topic}
                    </div>
                  )}
                  <div className="text-xxs text-text-mut font-mono">
                    Week of {trendReport.week_of} · {obs.length} → content queue
                  </div>
                </div>
              )
            })() : (
              <div className="text-xxs text-text-mut font-mono leading-relaxed">
                No report yet.<br />
                Aria runs Monday 7:00 AM IST via Task Scheduler.
              </div>
            )}
          </div>
        </div>

        {/* Ola chat */}
        <div className="w-[300px] shrink-0 flex flex-col bg-bg-base border-l border-bdr">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-bdr shrink-0">
            <div className="w-5 h-5 rounded-full bg-gtm-orange/20 border border-gtm-orange/40 flex items-center justify-center">
              <Settings2 size={9} className="text-gtm-orange" />
            </div>
            <span className="text-xs font-mono text-text-sec">Ola — COO</span>
            {isStreaming && <Loader2 size={11} className="ml-auto text-gtm-orange animate-spin" />}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => {
              const isLast = i === messages.length - 1
              return (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-gtm-orange/20 border border-gtm-orange/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Settings2 size={10} className="text-gtm-orange" />
                    </div>
                  )}
                  <div className={`max-w-[88%] text-xs leading-relaxed px-2.5 py-2 rounded-lg whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-gtm-orange/10 border border-gtm-orange/20 text-text-pri'
                      : msg.isError
                        ? 'bg-danger/5 border border-danger/20 text-danger'
                        : 'bg-bg-s2 border border-bdr text-text-sec'
                  }`}>
                    {msg.content}
                    {msg.role === 'assistant' && isLast && !msg.done && (
                      <StreamCursor />
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-bdr p-2 space-y-1.5 shrink-0">
            <div className="flex gap-1 flex-wrap">
              {['/okr', '/health', '/tools', '/automate', '/weekly'].map(p => (
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
                placeholder="Ask Ola…"
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

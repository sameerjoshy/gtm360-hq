import { useEffect, useState, useRef, useCallback } from 'react'
import {
  supabase, fmt$, STAGE_LABELS, SERVICE_LABELS, getCompanyName,
} from '../lib/supabase'
import {
  Briefcase, Search, Loader2, Square, AlertCircle,
  Globe, User, DollarSign, Target, Zap, Activity,
  ChevronRight, CalendarDays, ArrowRight,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const ICP_COLOR = {
  Strong:    { dot: '#00E676', text: 'text-ok',      badge: 'badge-green'  },
  Moderate:  { dot: '#FFD600', text: 'text-warn',     badge: 'badge-warn'   },
  'Non-ICP': { dot: '#FF1744', text: 'text-danger',   badge: 'badge-danger' },
}

const STAGE_COLOR = {
  Radar:     'text-text-mut',
  Connected: 'text-info',
  Engaged:   'text-warn',
  Discovery: 'text-warn',
  Proposal:  'text-gtm-orange',
  Active:    'text-ok',
}

// ─── Claude prompt builders ────────────────────────────────────────────────────
const REX_SYSTEM = `You are Rex, the fractional CRO for GTM360. You specialize in B2B SaaS revenue strategy, pipeline progression, and sales intelligence. You produce crisp, opinionated research briefs that founders and revenue leaders can absorb in under 3 minutes before any prospect meeting.

Your output format:
## Company Snapshot
## GTM Pain Signals
## Why GTM360 Fits
## Recommended Engagement (DIAG / FCRO / ROPS + rationale)
## Talk Track (opening statement, 2–3 key questions)
## Next Action

Rules: No filler. No hedging. Be specific. Use bullet points. Maximum signal per word.`

function buildResearchPrompt(deal) {
  const co = getCompanyName(deal)
  return `Research brief for: ${co}

Deal data:
- Domain: ${deal.company_domain || 'unknown'}
- Stage: ${STAGE_LABELS[deal.stage] || deal.stage}
- Service interest: ${deal.service_line} (${SERVICE_LABELS?.[deal.service_line] || deal.service_line})
- ICP fit: ${deal.icp_fit || 'unknown'}${deal.icp_score ? ` · Score ${deal.icp_score}/10` : ''}
- Deal value: ${fmt$(deal.amount)}
- Contact: ${deal.contact_name || 'unknown'}${deal.contact_email ? ` <${deal.contact_email}>` : ''}
${deal.research_notes ? `- Notes: ${deal.research_notes}` : ''}

Generate the full Rex research brief for my next meeting with ${co}.`
}

function buildPrepPrompt(deal) {
  const co = getCompanyName(deal)
  return `Call prep for ${co}.

Context:
- Stage: ${STAGE_LABELS[deal.stage] || deal.stage}
- Deal: ${fmt$(deal.amount)} · ${deal.service_line}
- Contact: ${deal.contact_name || 'the prospect'}

Give me exactly:
1. The 3 must-ask questions to advance this deal
2. Top 3 likely objections + how to handle each (direct, no sugarcoating)
3. The outcome I should walk away with from this call
4. My verbatim 30-second opening statement

Be as specific as possible to ${co}.`
}

// ─── Streaming hook (raw fetch + SSE — zero Node.js deps) ────────────────────
function useResearch() {
  const [output, setOutput]        = useState('')
  const [isStreaming, setStreaming] = useState(false)
  const [error, setError]          = useState(null)
  const [activeCmd, setActiveCmd]  = useState(null)
  const abortRef = useRef(null)

  const run = useCallback(async (deal, cmd) => {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey || apiKey === 'your-anthropic-api-key-here') {
      setError('Add VITE_ANTHROPIC_API_KEY to .env.local to enable Claude streaming.')
      return
    }
    if (isStreaming) return

    setOutput('')
    setError(null)
    setActiveCmd(cmd)
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller
    const prompt = cmd === '/research' ? buildResearchPrompt(deal) : buildPrepPrompt(deal)

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
          max_tokens: 2048,
          stream: true,
          thinking: { type: 'adaptive' },
          system: REX_SYSTEM,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message || `HTTP ${res.status}`)
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buf     = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() // keep incomplete line
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const json = line.slice(6).trim()
          if (json === '[DONE]') continue
          try {
            const evt = JSON.parse(json)
            if (
              evt.type === 'content_block_delta' &&
              evt.delta?.type === 'text_delta'
            ) {
              setOutput(prev => prev + evt.delta.text)
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Stream failed')
      }
    } finally {
      setStreaming(false)
      setActiveCmd(null)
      abortRef.current = null
    }
  }, [isStreaming])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const clear = useCallback(() => {
    setOutput('')
    setError(null)
  }, [])

  return { output, isStreaming, error, activeCmd, run, stop, clear }
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function IcpBadge({ fit }) {
  const cfg = ICP_COLOR[fit]
  if (!cfg) return <span className="text-text-mut text-xxs font-mono">—</span>
  return (
    <span className={`text-xxs font-mono ${cfg.text}`}>
      <span
        className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
        style={{ background: cfg.dot }}
      />
      {fit}
    </span>
  )
}

function StageBadge({ stage }) {
  const label = STAGE_LABELS[stage] || stage
  const color = STAGE_COLOR[label] || 'text-text-sec'
  return <span className={`text-xxs font-mono ${color}`}>{label}</span>
}

function SignalDot({ signal }) {
  const map = { Hot: 'bg-ok', Watch: 'bg-warn', Cold: 'bg-text-mut' }
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${map[signal] || 'bg-bg-s2'}`}
      title={signal || ''}
    />
  )
}

function StreamCursor() {
  return (
    <span className="inline-block w-[3px] h-[14px] bg-gtm-orange rounded-sm ml-0.5 align-middle animate-pulse" />
  )
}

// Rendered markdown-lite: bold, headers
function OutputRenderer({ text, isStreaming }) {
  if (!text) return null
  const lines = text.split('\n')

  return (
    <div className="text-xs font-mono text-text-sec leading-relaxed space-y-0.5">
      {lines.map((line, i) => {
        const isLast = i === lines.length - 1
        // H2 headers (## ...)
        if (line.startsWith('## ')) {
          return (
            <div key={i} className="text-text-pri font-mono text-xs uppercase tracking-widest pt-3 pb-1 border-b border-bdr/50 mb-1">
              {line.replace('## ', '')}
            </div>
          )
        }
        // H3
        if (line.startsWith('### ')) {
          return <div key={i} className="text-gtm-orange text-xxs font-mono uppercase tracking-wider pt-2">{line.replace('### ', '')}</div>
        }
        // Bold **text**
        const rendered = line.replace(/\*\*(.*?)\*\*/g, (_, m) => `<strong class="text-text-pri">${m}</strong>`)
        // Bullets
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-gtm-orange shrink-0 mt-0.5">›</span>
              <span dangerouslySetInnerHTML={{ __html: rendered.replace(/^[-•]\s/, '') }} />
              {isLast && isStreaming && <StreamCursor />}
            </div>
          )
        }
        // Numbered
        if (/^\d+\.\s/.test(line)) {
          const num = line.match(/^(\d+)\./)[1]
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-gtm-orange shrink-0 font-mono text-xxs mt-0.5 w-3">{num}.</span>
              <span dangerouslySetInnerHTML={{ __html: rendered.replace(/^\d+\.\s/, '') }} />
              {isLast && isStreaming && <StreamCursor />}
            </div>
          )
        }
        // Empty line → spacer
        if (!line.trim()) return <div key={i} className="h-1" />
        // Regular line
        return (
          <div key={i} dangerouslySetInnerHTML={{ __html: rendered + (isLast && isStreaming ? '' : '') }}>
          </div>
        )
      })}
      {isStreaming && lines[lines.length - 1]?.trim() && !lines[lines.length - 1].startsWith('-') && !lines[lines.length - 1].startsWith('•') && !/^\d+\./.test(lines[lines.length - 1]) && <StreamCursor />}
    </div>
  )
}

// Detail row
function DetailRow({ icon: Icon, label, value, mono }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5 text-xs">
      <Icon size={11} className="text-text-mut shrink-0 mt-0.5" />
      <span className="text-text-mut w-14 shrink-0 text-xxs">{label}</span>
      <span className={`text-text-sec flex-1 leading-tight ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function RexView() {
  const [deals, setDeals]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(null)
  const [search, setSearch]         = useState('')
  const [stageFilter, setStageFilter] = useState('All')
  const [icpFilter, setIcpFilter]   = useState('All')
  const { output, isStreaming, error, activeCmd, run, stop, clear } = useResearch()
  const outputRef = useRef(null)

  useEffect(() => {
    supabase
      .from('pipeline_snapshot')
      .select('*')
      .order('amount', { ascending: false })
      .then(({ data }) => {
        const rows = data || []
        setDeals(rows)
        setSelected(rows[0] || null)
        setLoading(false)
      })
  }, [])

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current && isStreaming) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output, isStreaming])

  const filtered = deals.filter(d => {
    const name = getCompanyName(d).toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase())
    const matchStage  = stageFilter === 'All' || STAGE_LABELS[d.stage] === stageFilter
    const matchIcp    = icpFilter   === 'All' || d.icp_fit === icpFilter
    return matchSearch && matchStage && matchIcp
  })

  const totalPipeline = deals.reduce((s, d) => s + (d.amount || 0), 0)

  const handleSelect = (d) => {
    setSelected(d)
    if (!isStreaming) clear()
  }

  const handleCommand = (cmd) => {
    if (!selected) return
    run(selected, cmd)
  }

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-bdr shrink-0">
        <div className="flex items-center gap-2">
          <Briefcase size={14} className="text-gtm-orange" />
          <span className="font-display text-lg tracking-wide">Rex</span>
          <span className="text-text-mut text-xs font-mono">— CRO</span>
        </div>

        <div className="flex-1" />

        {/* Command buttons */}
        {selected && (
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <button
                onClick={stop}
                className="flex items-center gap-1.5 border border-danger/40 text-danger text-xs px-3 py-1.5 rounded-md hover:bg-danger/10 transition-colors"
              >
                <Square size={11} fill="currentColor" />
                Stop
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleCommand('/research')}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Zap size={11} />
                  Research
                </button>
                <button
                  onClick={() => handleCommand('/prep')}
                  className="btn-ghost text-xs border border-bdr flex items-center gap-1.5"
                >
                  <Activity size={11} />
                  Prep
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-3 px-5 py-2 border-b border-bdr shrink-0">
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mut" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search company…"
            className="input-base pl-7 w-44 py-1.5 text-xs"
          />
        </div>

        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="input-base w-32 py-1.5 text-xs"
        >
          <option>All</option>
          {Object.values(STAGE_LABELS).map(s => <option key={s}>{s}</option>)}
        </select>

        <select
          value={icpFilter}
          onChange={e => setIcpFilter(e.target.value)}
          className="input-base w-28 py-1.5 text-xs"
        >
          <option>All</option>
          <option>Strong</option>
          <option>Moderate</option>
          <option>Non-ICP</option>
        </select>

        <div className="flex-1" />
        <span className="text-xxs text-text-mut font-mono">
          {filtered.length} deals · <span className="text-gtm-orange">{fmt$(totalPipeline)}</span>
        </span>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Pipeline list */}
        <div className="w-[380px] shrink-0 border-r border-bdr flex flex-col overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_80px_60px_60px] gap-2 px-4 py-2 border-b border-bdr">
            {['Company', 'Stage', 'Amt', 'ICP'].map(h => (
              <span key={h} className="text-xxs font-mono text-text-mut uppercase tracking-wider">{h}</span>
            ))}
          </div>

          {/* Table rows */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-px">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex gap-3 px-4 py-3 animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-bg-s2 mt-1.5 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 bg-bg-s2 rounded w-3/4" />
                      <div className="h-2 bg-bg-s2 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-xs text-text-mut">
                No deals match filters
              </div>
            ) : (
              filtered.map((d) => {
                const isActive = selected?.deal_id === d.deal_id
                const icp = ICP_COLOR[d.icp_fit]
                return (
                  <button
                    key={d.deal_id || getCompanyName(d)}
                    onClick={() => handleSelect(d)}
                    className={`
                      w-full grid grid-cols-[1fr_80px_60px_60px] gap-2 items-center
                      px-4 py-2.5 text-left transition-colors border-b border-bdr/40
                      ${isActive
                        ? 'bg-bg-s2 border-l-2 border-l-gtm-orange'
                        : 'hover:bg-bg-s2/60 border-l-2 border-l-transparent'}
                    `}
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-text-pri font-medium truncate">{getCompanyName(d)}</div>
                      <div className="text-xxs text-text-mut font-mono truncate">{d.service_line}</div>
                    </div>
                    <StageBadge stage={d.stage} />
                    <span className="text-xs font-mono text-text-sec">{fmt$(d.amount)}</span>
                    <div className="flex items-center gap-1">
                      {icp && (
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: icp.dot }}
                        />
                      )}
                      <SignalDot signal={d.signal} />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right panel: deal detail + output */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {selected ? (
            <>
              {/* Deal detail strip */}
              <div className="shrink-0 border-b border-bdr px-5 py-4 bg-bg-s1">
                <div className="flex items-start justify-between gap-4">
                  {/* Identity */}
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-2xl text-text-pri tracking-wide leading-none">
                        {getCompanyName(selected)}
                      </span>
                      {selected.icp_fit && (
                        <IcpBadge fit={selected.icp_fit} />
                      )}
                    </div>
                    {selected.company_domain && (
                      <a
                        href={`https://${selected.company_domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xxs text-text-mut font-mono hover:text-gtm-orange transition-colors flex items-center gap-1 mt-0.5"
                      >
                        <Globe size={9} />
                        {selected.company_domain}
                      </a>
                    )}
                  </div>

                  {/* Key metrics */}
                  <div className="flex items-center gap-5 shrink-0">
                    <div className="text-right">
                      <div className="font-display text-xl text-gtm-orange">{fmt$(selected.amount)}</div>
                      <div className="text-xxs text-text-mut font-mono">deal value</div>
                    </div>
                    {selected.icp_score && (
                      <div className="text-right">
                        <div className="font-display text-xl text-text-pri">{selected.icp_score}<span className="text-sm text-text-mut">/10</span></div>
                        <div className="text-xxs text-text-mut font-mono">ICP score</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Detail fields */}
                <div className="grid grid-cols-3 gap-x-6 gap-y-1.5 mt-3">
                  <DetailRow icon={ArrowRight}    label="Stage"   value={STAGE_LABELS[selected.stage] || selected.stage} mono />
                  <DetailRow icon={Briefcase}     label="Service" value={selected.service_line} mono />
                  <DetailRow icon={CalendarDays}  label="Close"   value={selected.close_date} mono />
                  <DetailRow icon={User}          label="Contact" value={selected.contact_name} />
                  <DetailRow icon={DollarSign}    label="Amount"  value={fmt$(selected.amount)} mono />
                  <DetailRow icon={Target}        label="Signal"  value={selected.signal} mono />
                </div>
              </div>

              {/* Output area */}
              <div ref={outputRef} className="flex-1 overflow-y-auto p-5">
                {error ? (
                  <div className="flex items-start gap-2 p-3 bg-danger/5 border border-danger/20 rounded-lg">
                    <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-danger font-mono font-medium">Error</div>
                      <div className="text-xs text-text-sec mt-0.5">{error}</div>
                    </div>
                  </div>
                ) : output ? (
                  <div>
                    {/* Command badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xxs font-mono text-gtm-orange border border-gtm-orange/30 px-2 py-0.5 rounded">
                        {activeCmd || '/research'}
                      </span>
                      <span className="text-xxs text-text-mut font-mono">{getCompanyName(selected)}</span>
                      {isStreaming && (
                        <span className="flex items-center gap-1 text-xxs text-text-mut font-mono ml-auto">
                          <Loader2 size={10} className="animate-spin text-gtm-orange" />
                          streaming…
                        </span>
                      )}
                    </div>
                    <OutputRenderer text={output} isStreaming={isStreaming} />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-bg-s2 border border-bdr flex items-center justify-center">
                      <Briefcase size={18} className="text-text-mut" />
                    </div>
                    <div>
                      <div className="text-sm text-text-sec">Ready to research <span className="text-text-pri">{getCompanyName(selected)}</span></div>
                      <div className="text-xs text-text-mut mt-1">
                        Hit <span className="font-mono text-gtm-orange">Research</span> for a full brief ·{' '}
                        <span className="font-mono text-gtm-orange">Prep</span> for call prep
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => handleCommand('/research')} className="btn-primary text-xs flex items-center gap-1.5">
                        <Zap size={11} /> Research
                      </button>
                      <button onClick={() => handleCommand('/prep')} className="btn-ghost text-xs border border-bdr flex items-center gap-1.5">
                        <Activity size={11} /> Prep
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-text-mut text-sm">
              Select a deal to view details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

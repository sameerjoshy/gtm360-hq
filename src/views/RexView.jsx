import { useEffect, useState, useRef, useCallback } from 'react'
import {
  supabase, fmt$, STAGE_LABELS, SERVICE_LABELS, getCompanyName,
} from '../lib/supabase'
import { generateIntel, saveIntelToSupabase } from '../lib/intel'
import {
  Briefcase, Search, Loader2, Square, AlertCircle,
  Globe, User, DollarSign, Target, Zap, Activity,
  ChevronRight, CalendarDays, ArrowRight,
  Copy, CheckCircle, Database, Shield,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const ICP_COLOR = {
  Strong:    { dot: '#059669', text: 'text-ok',      badge: 'badge-green'  },
  Moderate:  { dot: '#D97706', text: 'text-warn',     badge: 'badge-warn'   },
  'Non-ICP': { dot: '#EF4444', text: 'text-danger',   badge: 'badge-danger' },
}

const STAGE_COLOR = {
  Radar:     'text-text-mut',
  Connected: 'text-info',
  Engaged:   'text-warn',
  Discovery: 'text-warn',
  Proposal:  'text-gtm-orange',
  Active:    'text-ok',
}

const PRIORITY_COLOR = {
  HIGH:   'text-danger',
  MEDIUM: 'text-warn',
  LOW:    'text-text-mut',
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

function buildCampaignPrompt(deal) {
  const co = getCompanyName(deal)
  return `Outreach campaign design for ${co}.

Deal: ${deal.service_line} · ${fmt$(deal.amount)} · ICP ${deal.icp_fit || 'unknown'}
Stage: ${STAGE_LABELS[deal.stage] || deal.stage}
Contact: ${deal.contact_name || 'unknown'}${deal.contact_email ? ` <${deal.contact_email}>` : ''}
Domain: ${deal.company_domain || 'unknown'}

Design a 30-day outreach campaign:

## Channel Strategy
Which channels and why — LinkedIn, email, phone, event, referral.

## Sequence
Day 1, 3, 7, 14, 21, 30 — specific action + exact hook for each touchpoint. No generic templates.

## Personalization Angles
What do I lead with and why. What's the most compelling entry point for ${deal.contact_name || 'this contact'}.

## Breakout Hook
The single message most likely to get a response. Write it verbatim.

## Success Signals
What actions tell me this deal is advancing to the next stage.`
}

function buildIcpPrompt(deal) {
  const co = getCompanyName(deal)
  return `ICP assessment for ${co}.

Current data:
- ICP fit: ${deal.icp_fit || 'unknown'}${deal.icp_score ? ` · Score ${deal.icp_score}/10` : ''}
- Service: ${deal.service_line}
- Stage: ${STAGE_LABELS[deal.stage] || deal.stage}
- Domain: ${deal.company_domain || 'unknown'}
- Contact: ${deal.contact_name || 'unknown'}

GTM-360 ICP definition:
Primary: Early-stage B2B founders (Seed–B, 10–150 employees, $1M–$15M ARR)
Secondary: Scale-up CROs (100–500 employees, $15M–$100M ARR)
Vertical: B2B SaaS and B2B Services only. No B2C.
Entry: GTM Diagnostic (proof of value first)

Run a full ICP assessment:

## ICP Fit Score: [X/10]
Score with clear justification. Be brutal.

## Fit Dimensions
Company size · Revenue stage · GTM maturity · Decision-maker access · Budget signal

## Service Line Fit
Which GTM-360 offering (DIAG / FCRO / ROPS) is the right entry and why. Sequence if multiple apply.

## Disqualifiers
What could kill this deal. Flag anything that makes this non-ICP.

## Verdict
Strong / Moderate / Weak — and the single most important next action.`
}

// ─── Streaming hook (raw fetch + SSE) ────────────────────────────────────────
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
    const builders = {
      '/research': buildResearchPrompt,
      '/prep':     buildPrepPrompt,
      '/campaign': buildCampaignPrompt,
      '/icp':      buildIcpPrompt,
    }
    const prompt = (builders[cmd] || buildResearchPrompt)(deal)

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
        buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const json = line.slice(6).trim()
          if (json === '[DONE]') continue
          try {
            const evt = JSON.parse(json)
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              setOutput(prev => prev + evt.delta.text)
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || 'Stream failed')
    } finally {
      setStreaming(false)
      setActiveCmd(null)
      abortRef.current = null
    }
  }, [isStreaming])

  const stop  = useCallback(() => { abortRef.current?.abort() }, [])
  const clear = useCallback(() => { setOutput(''); setError(null) }, [])

  return { output, isStreaming, error, activeCmd, run, stop, clear }
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function IcpBadge({ fit }) {
  const cfg = ICP_COLOR[fit]
  if (!cfg) return <span className="text-text-mut text-xxs font-mono">—</span>
  return (
    <span className={`text-xxs font-mono ${cfg.text}`}>
      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: cfg.dot }} />
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
  return <span className="inline-block w-[3px] h-[14px] bg-gtm-orange rounded-sm ml-0.5 align-middle animate-pulse" />
}

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

// ─── Research/Prep output renderer ───────────────────────────────────────────
function OutputRenderer({ text, isStreaming }) {
  if (!text) return null
  const lines = text.split('\n')
  return (
    <div className="text-xs font-mono text-text-sec leading-relaxed space-y-0.5">
      {lines.map((line, i) => {
        const isLast = i === lines.length - 1
        if (line.startsWith('## ')) {
          return (
            <div key={i} className="text-text-pri font-mono text-xs uppercase tracking-widest pt-3 pb-1 border-b border-bdr/50 mb-1">
              {line.replace('## ', '')}
            </div>
          )
        }
        if (line.startsWith('### ')) {
          return <div key={i} className="text-gtm-orange text-xxs font-mono uppercase tracking-wider pt-2">{line.replace('### ', '')}</div>
        }
        const rendered = line.replace(/\*\*(.*?)\*\*/g, (_, m) => `<strong class="text-text-pri">${m}</strong>`)
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-gtm-orange shrink-0 mt-0.5">›</span>
              <span dangerouslySetInnerHTML={{ __html: rendered.replace(/^[-•]\s/, '') }} />
              {isLast && isStreaming && <StreamCursor />}
            </div>
          )
        }
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
        if (!line.trim()) return <div key={i} className="h-1" />
        return <div key={i} dangerouslySetInnerHTML={{ __html: rendered }} />
      })}
      {isStreaming && lines[lines.length - 1]?.trim() &&
        !lines[lines.length - 1].startsWith('-') &&
        !lines[lines.length - 1].startsWith('•') &&
        !/^\d+\./.test(lines[lines.length - 1]) && <StreamCursor />}
    </div>
  )
}

// ─── Intel sub-components ─────────────────────────────────────────────────────
function StepItem({ step }) {
  const iconMap = {
    running: <Loader2 size={11} className="animate-spin text-gtm-orange shrink-0" />,
    done:    <CheckCircle size={11} className="text-ok shrink-0" />,
    warn:    <AlertCircle size={11} className="text-warn shrink-0" />,
    error:   <AlertCircle size={11} className="text-danger shrink-0" />,
    pending: <div className="w-2.5 h-2.5 rounded-full border border-bdr shrink-0" />,
    info:    <div className="w-2 h-2 rounded-full bg-accent/40 ml-0.5 shrink-0" />,
  }
  const colorMap = {
    running: 'text-text-pri',
    done:    'text-ok',
    warn:    'text-warn',
    error:   'text-danger',
    pending: 'text-text-mut',
    info:    'text-text-mut',
  }
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      {iconMap[step.status] ?? iconMap.pending}
      <span className={colorMap[step.status] ?? 'text-text-mut'}>{step.label}</span>
    </div>
  )
}

function IntelCard({ title, children, action }) {
  return (
    <div className="border border-bdr rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-bg-s2 border-b border-bdr">
        <span className="text-xxs font-mono text-text-mut uppercase tracking-widest">{title}</span>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function SnapField({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div>
      <div className="text-xxs text-text-mut font-mono uppercase tracking-wider">{label}</div>
      <div className="text-xs text-text-pri mt-0.5 leading-snug">{value}</div>
    </div>
  )
}

function CompanySnapshotCard({ snap }) {
  if (!snap) return null
  return (
    <IntelCard title="01 · Company Snapshot">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-x-6 gap-y-3">
          <SnapField label="Employees"  value={snap.employees} />
          <SnapField label="Revenue"    value={snap.revenue} />
          <SnapField label="Funding"    value={snap.funding} />
          <SnapField label="Model"      value={snap.business_model} />
          {snap.icp_fit_score && (
            <SnapField
              label="ICP Fit"
              value={`${snap.icp_fit_score}/10 — ${snap.icp_fit_label || ''}`}
            />
          )}
        </div>
        {snap.tech_stack?.length > 0 && (
          <div>
            <div className="text-xxs text-text-mut font-mono uppercase tracking-wider mb-1.5">Tech Stack</div>
            <div className="flex flex-wrap gap-1">
              {snap.tech_stack.map(t => (
                <span key={t} className="badge-muted">{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </IntelCard>
  )
}

function PainHookCard({ hook, onCopy, copied }) {
  if (!hook) return null
  return (
    <IntelCard
      title="02 · Financial Pain Hook"
      action={
        <button
          onClick={onCopy}
          className="flex items-center gap-1 text-xxs font-mono text-text-mut hover:text-gtm-orange transition-colors border border-bdr rounded px-2 py-0.5"
        >
          {copied
            ? <><CheckCircle size={9} className="text-ok" />&nbsp;Copied</>
            : <><Copy size={9} />&nbsp;Copy Hook</>}
        </button>
      }
    >
      <p className="text-sm text-text-pri leading-relaxed">{hook}</p>
    </IntelCard>
  )
}

function BuyingCommitteeCard({ committee }) {
  if (!committee?.length) return null
  return (
    <IntelCard title="03 · Buying Committee">
      <div className="space-y-0">
        {committee.map((p, i) => (
          <div key={i} className="flex items-start gap-4 py-2.5 border-b border-bdr/40 last:border-0">
            <div className="w-28 shrink-0">
              <div className="text-xxs font-mono text-text-mut uppercase leading-tight">{p.role}</div>
              <div className={`text-xxs font-mono font-bold mt-0.5 ${PRIORITY_COLOR[p.priority] || 'text-text-mut'}`}>
                {p.priority}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-text-pri">{p.name || '[NO DATA]'}</span>
                {p.linkedin && (
                  <a
                    href={p.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xxs text-info hover:underline font-mono"
                  >
                    LinkedIn ↗
                  </a>
                )}
              </div>
              <div className="text-xxs text-text-mut font-mono mt-0.5">{p.title}</div>
              <div className="text-xs text-text-sec mt-1 leading-snug">{p.why}</div>
            </div>
          </div>
        ))}
      </div>
    </IntelCard>
  )
}

function AccessStrategyCard({ strategy }) {
  if (!strategy) return null
  return (
    <IntelCard title="04 · Access Strategy">
      <div className="space-y-4">
        {strategy.warm_paths?.length > 0 && (
          <div>
            <div className="text-xxs font-mono text-text-mut uppercase tracking-wider mb-1.5">Warm Paths</div>
            <ul className="space-y-1">
              {strategy.warm_paths.map((p, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-text-sec">
                  <span className="text-gtm-orange shrink-0">›</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {strategy.sequence?.length > 0 && (
          <div>
            <div className="text-xxs font-mono text-text-mut uppercase tracking-wider mb-1.5">Outreach Sequence</div>
            <div className="space-y-1.5">
              {strategy.sequence.map((s, i) => (
                <div key={i} className="flex gap-2 text-xs items-baseline">
                  <span className="font-mono text-text-mut w-10 shrink-0 text-xxs">Day {s.day}</span>
                  <span className="font-mono text-gtm-orange w-16 shrink-0 text-xxs">{s.channel}</span>
                  <span className="text-text-sec leading-snug">{s.hook}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {strategy.opening_line && (
          <div className="bg-accent-light border border-accent/20 rounded-lg p-3">
            <div className="text-xxs font-mono text-accent uppercase tracking-wider mb-1.5">Opening Line — use verbatim</div>
            <p className="text-sm text-text-pri leading-relaxed">"{strategy.opening_line}"</p>
          </div>
        )}
      </div>
    </IntelCard>
  )
}

function CompetitiveContextCard({ ctx }) {
  if (!ctx) return null
  return (
    <IntelCard title="05 · Competitive Context">
      <div className="space-y-4">
        {ctx.competitors?.length > 0 && (
          <div>
            <div className="text-xxs font-mono text-text-mut uppercase tracking-wider mb-1.5">Competitors they face</div>
            <div className="flex flex-wrap gap-1">
              {ctx.competitors.map(c => <span key={c} className="badge-muted">{c}</span>)}
            </div>
          </div>
        )}

        {ctx.gtm360_positioning && (
          <div>
            <div className="text-xxs font-mono text-text-mut uppercase tracking-wider mb-1.5">GTM-360 Positioning</div>
            <p className="text-xs text-text-sec leading-relaxed">{ctx.gtm360_positioning}</p>
          </div>
        )}

        {ctx.likely_objections?.length > 0 && (
          <div>
            <div className="text-xxs font-mono text-text-mut uppercase tracking-wider mb-1.5">Likely Objections</div>
            <div className="space-y-2.5">
              {ctx.likely_objections.map((o, i) => (
                <div key={i} className="border-l-2 border-warn/50 pl-3">
                  <div className="text-xs text-warn font-medium leading-snug">{o.objection}</div>
                  <div className="text-xs text-text-sec mt-1 leading-snug">{o.response}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </IntelCard>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function RexView() {
  const [deals, setDeals]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState(null)
  const [search, setSearch]           = useState('')
  const [stageFilter, setStageFilter] = useState('All')
  const [icpFilter, setIcpFilter]     = useState('All')

  // Research / Prep state
  const { output, isStreaming, error, activeCmd, run, stop, clear } = useResearch()

  // Intel state
  const [activePanel, setActivePanel]   = useState(null) // 'research' | 'prep' | 'intel'
  const [intelSteps, setIntelSteps]     = useState([])
  const [intelData, setIntelData]       = useState(null)
  const [intelLoading, setIntelLoading] = useState(false)
  const [intelError, setIntelError]     = useState(null)
  const [copiedHook, setCopiedHook]     = useState(false)
  const [savedToDb, setSavedToDb]       = useState(false)
  const intelAbortRef = useRef(null)

  const outputRef = useRef(null)

  // ── Data load ──────────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (outputRef.current && isStreaming) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output, isStreaming])

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = deals.filter(d => {
    const name = getCompanyName(d).toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase())
    const matchStage  = stageFilter === 'All' || STAGE_LABELS[d.stage] === stageFilter
    const matchIcp    = icpFilter   === 'All' || d.icp_fit === icpFilter
    return matchSearch && matchStage && matchIcp
  })

  const totalPipeline = deals.reduce((s, d) => s + (d.amount || 0), 0)

  // ── Event handlers ─────────────────────────────────────────────────────────
  const cancelIntel = () => {
    intelAbortRef.current?.abort()
    setIntelLoading(false)
  }

  const resetIntelState = () => {
    cancelIntel()
    setIntelSteps([])
    setIntelData(null)
    setIntelError(null)
    setSavedToDb(false)
    setCopiedHook(false)
  }

  const handleSelect = (d) => {
    setSelected(d)
    if (!isStreaming) clear()
    resetIntelState()
    setActivePanel(null)
  }

  const handleCommand = (cmd) => {
    if (!selected) return
    cancelIntel()
    setActivePanel(cmd === '/research' ? 'research' : 'prep')
    run(selected, cmd)
  }

  const handleIntel = async () => {
    if (!selected) return
    if (isStreaming) stop()
    resetIntelState()
    setActivePanel('intel')
    setIntelLoading(true)

    const controller = new AbortController()
    intelAbortRef.current = controller

    try {
      const intel = await generateIntel(selected, setIntelSteps, controller.signal)
      setIntelData(intel)
    } catch (e) {
      if (e.name !== 'AbortError') {
        setIntelError(e.message || 'Intel generation failed')
      }
    } finally {
      setIntelLoading(false)
      intelAbortRef.current = null
    }
  }

  const handleCopyHook = () => {
    if (!intelData?.financial_pain_hook) return
    navigator.clipboard.writeText(intelData.financial_pain_hook)
    setCopiedHook(true)
    setTimeout(() => setCopiedHook(false), 2000)
  }

  const handleSaveToDb = async () => {
    if (!intelData || !selected) return
    try {
      await saveIntelToSupabase(selected, intelData)
      setSavedToDb(true)
    } catch (e) {
      setIntelError(`Save failed: ${e.message}`)
    }
  }

  const anyRunning = isStreaming || intelLoading

  // ── Render ─────────────────────────────────────────────────────────────────
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

        {selected && (
          <div className="flex items-center gap-2">
            {anyRunning ? (
              <button
                onClick={() => { stop(); cancelIntel() }}
                className="flex items-center gap-1.5 border border-danger/40 text-danger text-xs px-3 py-1.5 rounded-md hover:bg-danger/10 transition-colors"
              >
                <Square size={11} fill="currentColor" />
                Stop
              </button>
            ) : (
              <>
                <button
                  onClick={handleIntel}
                  className="btn-orange text-xs flex items-center gap-1.5"
                >
                  <Zap size={11} />
                  ⚡ Intel
                </button>
                <button
                  onClick={() => handleCommand('/research')}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Activity size={11} />
                  Research
                </button>
                <button
                  onClick={() => handleCommand('/prep')}
                  className="btn-ghost text-xs border border-bdr flex items-center gap-1.5"
                >
                  <ChevronRight size={11} />
                  Prep
                </button>
                <button
                  onClick={() => handleCommand('/campaign')}
                  className="btn-ghost text-xs border border-bdr flex items-center gap-1.5"
                >
                  Campaign
                </button>
                <button
                  onClick={() => handleCommand('/icp')}
                  className="btn-ghost text-xs border border-bdr flex items-center gap-1.5"
                >
                  ICP
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

        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="input-base w-32 py-1.5 text-xs">
          <option>All</option>
          {Object.values(STAGE_LABELS).map(s => <option key={s}>{s}</option>)}
        </select>

        <select value={icpFilter} onChange={e => setIcpFilter(e.target.value)} className="input-base w-28 py-1.5 text-xs">
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
          <div className="grid grid-cols-[1fr_80px_60px_60px] gap-2 px-4 py-2 border-b border-bdr">
            {['Company', 'Stage', 'Amt', 'ICP'].map(h => (
              <span key={h} className="text-xxs font-mono text-text-mut uppercase tracking-wider">{h}</span>
            ))}
          </div>

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
              filtered.map(d => {
                const isActive = selected?.deal_id === d.deal_id
                const icp = ICP_COLOR[d.icp_fit]
                return (
                  <button
                    key={d.deal_id || getCompanyName(d)}
                    onClick={() => handleSelect(d)}
                    className={`
                      w-full grid grid-cols-[1fr_80px_60px_60px] gap-2 items-center
                      px-4 py-3 text-left transition-colors border-b border-bdr/40
                      ${isActive
                        ? 'bg-bg-s2 border-l-2 border-l-gtm-orange'
                        : 'hover:bg-bg-s2/60 border-l-2 border-l-transparent'}
                    `}
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-text-pri font-medium truncate">{getCompanyName(d)}</div>
                      <div className="text-xs text-text-mut font-mono truncate">{d.service_line}</div>
                    </div>
                    <StageBadge stage={d.stage} />
                    <span className="text-sm font-mono text-text-sec">{fmt$(d.amount)}</span>
                    <div className="flex items-center gap-1">
                      {icp && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: icp.dot }} />}
                      {d.icp_fit === 'Non-ICP' && (
                        <span className="text-danger text-xxs leading-none" title="Non-ICP">⚠</span>
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
                  <div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-display text-2xl text-text-pri tracking-wide leading-none">
                        {getCompanyName(selected)}
                      </span>
                      {selected.icp_fit && <IcpBadge fit={selected.icp_fit} />}
                      {selected.service_line && (
                        <span className="badge-indigo">{selected.service_line}</span>
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

                  <div className="flex items-center gap-5 shrink-0">
                    <div className="text-right">
                      <div className="font-display text-xl text-gtm-orange">{fmt$(selected.amount)}</div>
                      <div className="text-xxs text-text-mut font-mono">deal value</div>
                    </div>
                    {selected.icp_score && (
                      <div className="text-right">
                        <div className="font-display text-xl text-text-pri">
                          {selected.icp_score}<span className="text-sm text-text-mut">/10</span>
                        </div>
                        <div className="text-xxs text-text-mut font-mono">ICP score</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-x-6 gap-y-1.5 mt-3">
                  <DetailRow icon={ArrowRight}   label="Stage"   value={STAGE_LABELS[selected.stage] || selected.stage} mono />
                  <DetailRow icon={Briefcase}    label="Service" value={
                    selected.service_line
                      ? `${selected.service_line}${SERVICE_LABELS[selected.service_line] ? ` — ${SERVICE_LABELS[selected.service_line]}` : ''}`
                      : null
                  } mono />
                  <DetailRow icon={CalendarDays} label="Close"   value={
                    selected.close_date
                      ? new Date(selected.close_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : null
                  } mono />
                  <DetailRow icon={User}         label="Contact" value={selected.contact_name} />
                  <DetailRow icon={DollarSign}   label="Amount"  value={fmt$(selected.amount)} mono />
                  <DetailRow icon={Target}       label="Signal"  value={selected.signal} mono />
                </div>
              </div>

              {/* Output area */}
              <div ref={outputRef} className="flex-1 overflow-y-auto p-5">

                {/* ── Intel panel ── */}
                {activePanel === 'intel' && (
                  <div className="space-y-4">
                    {/* Intel header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap size={13} className="text-gtm-orange" />
                        <span className="font-mono text-xs text-text-pri uppercase tracking-widest">
                          Account Intelligence
                        </span>
                        <span className="text-text-mut font-mono text-xxs">— {getCompanyName(selected)}</span>
                      </div>
                      {intelData && (
                        <div className="flex items-center gap-2">
                          <span className={`text-xxs font-mono px-2 py-0.5 rounded border ${
                            intelData.confidence === 'HIGH'
                              ? 'text-ok border-ok/30 bg-ok-light'
                              : intelData.confidence === 'LOW'
                              ? 'text-warn border-warn/30 bg-warn-light'
                              : 'text-info border-info/30 bg-info-light'
                          }`}>
                            {intelData.confidence} confidence
                          </span>
                          {(intelData.data_sources || []).map(s => (
                            <span key={s} className="badge-muted">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Loading steps */}
                    {intelSteps.length > 0 && (
                      <div className="bg-bg-s2 border border-bdr rounded-lg p-3 space-y-1.5">
                        {intelSteps.map(step => <StepItem key={step.id} step={step} />)}
                      </div>
                    )}

                    {/* Error */}
                    {intelError && (
                      <div className="flex items-start gap-2 p-3 bg-danger/5 border border-danger/20 rounded-lg">
                        <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs text-danger font-mono font-medium">Intel Error</div>
                          <div className="text-xs text-text-sec mt-0.5">{intelError}</div>
                        </div>
                      </div>
                    )}

                    {/* Intel cards */}
                    {intelData && !intelLoading && (
                      <>
                        <CompanySnapshotCard snap={intelData.company_snapshot} />
                        <PainHookCard
                          hook={intelData.financial_pain_hook}
                          onCopy={handleCopyHook}
                          copied={copiedHook}
                        />
                        <BuyingCommitteeCard committee={intelData.buying_committee} />
                        <AccessStrategyCard  strategy={intelData.access_strategy} />
                        <CompetitiveContextCard ctx={intelData.competitive_context} />

                        {/* Save bar */}
                        <div className="flex items-center justify-between pt-2 border-t border-bdr">
                          <span className="text-xxs text-text-mut font-mono">
                            Generated {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={handleSaveToDb}
                            disabled={savedToDb}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${
                              savedToDb
                                ? 'bg-ok-light text-ok border border-ok/20 cursor-default'
                                : 'btn-primary'
                            }`}
                          >
                            {savedToDb
                              ? <><CheckCircle size={11} /> Saved to Supabase</>
                              : <><Database size={11} /> Save to Supabase</>}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── Research / Prep panel ── */}
                {(activePanel === 'research' || activePanel === 'prep') && (
                  <>
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
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xxs font-mono text-gtm-orange border border-gtm-orange/30 px-2 py-0.5 rounded">
                            {activeCmd || (activePanel === 'research' ? '/research' : '/prep')}
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
                      <div className="flex items-center justify-center h-full text-xs text-text-mut font-mono">
                        Starting…
                      </div>
                    )}
                  </>
                )}

                {/* ── Empty state ── */}
                {!activePanel && (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-bg-s2 border border-bdr flex items-center justify-center">
                      <Briefcase size={18} className="text-text-mut" />
                    </div>
                    <div>
                      <div className="text-sm text-text-sec">
                        Ready to research <span className="text-text-pri">{getCompanyName(selected)}</span>
                      </div>
                      <div className="text-xs text-text-mut mt-1">
                        <span className="font-mono text-gtm-orange">⚡ Intel</span> · {' '}
                        <span className="font-mono text-accent">Research</span> · {' '}
                        <span className="font-mono text-text-sec">Prep</span> · {' '}
                        <span className="font-mono text-text-sec">Campaign</span> · {' '}
                        <span className="font-mono text-text-sec">ICP</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                      <button onClick={handleIntel} className="btn-orange text-xs flex items-center gap-1.5">
                        <Zap size={11} /> ⚡ Intel
                      </button>
                      <button onClick={() => handleCommand('/research')} className="btn-primary text-xs flex items-center gap-1.5">
                        <Activity size={11} /> Research
                      </button>
                      <button onClick={() => handleCommand('/prep')} className="btn-ghost text-xs border border-bdr flex items-center gap-1.5">
                        <ChevronRight size={11} /> Prep
                      </button>
                      <button onClick={() => handleCommand('/campaign')} className="btn-ghost text-xs border border-bdr flex items-center gap-1.5">
                        Campaign
                      </button>
                      <button onClick={() => handleCommand('/icp')} className="btn-ghost text-xs border border-bdr flex items-center gap-1.5">
                        ICP
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

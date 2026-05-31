import { useEffect, useState, useCallback } from 'react'
import {
  Activity, RefreshCw, Loader2, AlertCircle,
  Copy, CheckCircle, RotateCcw, X, Mail,
  Calendar, Clock, ChevronRight,
} from 'lucide-react'
import {
  fetchNaraSignals, fetchNaraEscalations,
  dismissSignal, resolveEscalation, draftNaraResponse,
} from '../lib/nara'

// ─── Signal type config ───────────────────────────────────────────────────────
const SIG_CFG = {
  EMAIL_REPLY:     { label: 'Email Reply',     cls: 'text-ok bg-ok-light',             icon: Mail     },
  MEETING_BOOKED:  { label: 'Meeting Booked',  cls: 'text-gtm-orange bg-gtm-orange/10', icon: Calendar },
  email_reply:     { label: 'Email Reply',     cls: 'text-ok bg-ok-light',             icon: Mail     },
  meeting_booked:  { label: 'Meeting Booked',  cls: 'text-gtm-orange bg-gtm-orange/10', icon: Calendar },
  replied:         { label: 'Replied',         cls: 'text-ok bg-ok-light',             icon: Mail     },
  default:         { label: 'Signal',          cls: 'text-info bg-info-light',         icon: Activity },
}

function sigCfg(type) {
  return SIG_CFG[type] || SIG_CFG[type?.toLowerCase?.()] || SIG_CFG.default
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SignalBadge({ type }) {
  const cfg = sigCfg(type)
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xxs font-mono px-1.5 py-0.5 rounded font-medium ${cfg.cls}`}>
      <Icon size={9} />
      {cfg.label}
    </span>
  )
}

function SignalCard({ signal, isSelected, onSelect, onDraft, onDismiss, dismissing }) {
  const detectedAt = signal.signal_detected_at
    ? new Date(signal.signal_detected_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : signal.created_at
      ? new Date(signal.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : '—'

  return (
    <div
      className={`border-b border-bdr/40 px-4 py-3.5 transition-colors border-l-2 ${
        isSelected
          ? 'bg-bg-s2 border-l-gtm-orange'
          : 'hover:bg-bg-s2/50 border-l-transparent cursor-pointer'
      }`}
      onClick={() => onSelect(signal)}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="font-display text-base tracking-wide text-text-pri leading-tight">
          {signal.company_name}
        </div>
        <SignalBadge type={signal.signal_type_nara || signal.status} />
      </div>

      {(signal.contact_email || signal.contact_name) && (
        <div className="text-xs text-text-mut font-mono mb-1">
          {signal.contact_name && <span>{signal.contact_name} · </span>}
          {signal.contact_email}
        </div>
      )}

      {signal.response_notes && (
        <div className="text-xs text-text-sec mb-2 leading-snug line-clamp-2">
          {signal.response_notes}
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xxs text-text-mut font-mono mb-2.5">
        <Clock size={9} />
        {detectedAt}
        {signal.sequence_number && (
          <><span>·</span> Touch {signal.sequence_number}</>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onSelect(signal)}
          className="text-xxs font-mono px-2 py-1 border border-bdr rounded hover:border-text-sec transition-colors text-text-mut hover:text-text-pri"
        >
          <ChevronRight size={9} className="inline mr-0.5" />
          View
        </button>
        <button
          onClick={() => onDraft(signal)}
          className="text-xxs font-mono px-2 py-1 bg-gtm-orange/10 border border-gtm-orange/30 text-gtm-orange rounded hover:bg-gtm-orange/20 transition-colors"
        >
          Draft Response
        </button>
        <button
          onClick={() => onDismiss(signal.id)}
          disabled={dismissing}
          className="text-xxs font-mono px-2 py-1 border border-bdr rounded hover:border-danger/40 hover:text-danger text-text-mut transition-colors disabled:opacity-50"
        >
          {dismissing ? <Loader2 size={9} className="animate-spin" /> : <X size={9} className="inline" />}
          Dismiss
        </button>
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function NaraView() {
  const [signals, setSignals]         = useState([])
  const [escalations, setEscalations] = useState([])
  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const [selected, setSelected]       = useState(null)
  const [dismissing, setDismissing]   = useState({}) // { [id]: true }

  // Right panel
  const [draftSignal, setDraftSignal] = useState(null)
  const [drafting, setDrafting]       = useState(false)
  const [draftText, setDraftText]     = useState('')
  const [draftError, setDraftError]   = useState(null)
  const [copied, setCopied]           = useState(false)

  // ── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true)
    try {
      const [sigs, escs] = await Promise.all([
        fetchNaraSignals(),
        fetchNaraEscalations(),
      ])
      setSignals(sigs)
      setEscalations(escs)
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  // ── Derived metrics ──────────────────────────────────────────────────────
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todaySignals  = signals.filter(s => new Date(s.signal_detected_at || s.created_at) >= todayStart)
  const emailReplies  = signals.filter(s => ['EMAIL_REPLY', 'email_reply', 'replied'].includes(s.signal_type_nara || s.status))
  const meetingBooked = signals.filter(s => ['MEETING_BOOKED', 'meeting_booked'].includes(s.signal_type_nara))
  const responded     = signals.filter(s => s.response_received)

  const lastCheckTime = signals.length > 0
    ? new Date(signals[0].signal_detected_at || signals[0].created_at).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit',
      })
    : null

  // All signal items (outreach signals + escalations as unified feed)
  const allItems = [
    ...signals.map(s => ({ ...s, _source: 'signal' })),
    ...escalations.map(e => ({
      ...e,
      _source:         'escalation',
      company_name:    e.description?.split(' ')?.[0] || 'Escalation',
      signal_type_nara: 'EMAIL_REPLY',
      response_notes:  e.description,
      contact_email:   null,
      signal_detected_at: e.raised_at,
    })),
  ].sort((a, b) => new Date(b.signal_detected_at || b.raised_at) - new Date(a.signal_detected_at || a.raised_at))

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleDismiss = async (id) => {
    setDismissing(d => ({ ...d, [id]: true }))
    try {
      await dismissSignal(id)
      if (selected?.id === id) setSelected(null)
      if (draftSignal?.id === id) { setDraftSignal(null); setDraftText('') }
      await load(true)
    } catch (e) { console.error(e) }
    finally { setDismissing(d => { const n = { ...d }; delete n[id]; return n }) }
  }

  const handleDraft = async (signal) => {
    setDraftSignal(signal)
    setDraftText('')
    setDraftError(null)
    setDrafting(true)
    setCopied(false)
    try {
      const text = await draftNaraResponse(signal, signal.signal_type_nara || signal.status)
      setDraftText(text)
    } catch (e) {
      setDraftError(e.message)
    } finally {
      setDrafting(false)
    }
  }

  const handleRegenerate = () => {
    if (draftSignal) handleDraft(draftSignal)
  }

  const handleCopy = () => {
    if (!draftText) return
    navigator.clipboard.writeText(draftText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-bdr shrink-0">
        <Activity size={14} className="text-gtm-orange" />
        <span className="font-display text-lg tracking-wide">NARA</span>
        <span className="text-text-mut text-xs font-mono">— Nurture Monitor</span>
        {lastCheckTime && (
          <span className="text-xxs font-mono text-text-mut ml-1">
            · Last check: {lastCheckTime}
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="btn-ghost text-xs border border-bdr flex items-center gap-1.5"
        >
          <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 px-5 py-3 border-b border-bdr shrink-0">
        {[
          { label: 'Signals Today',   value: todaySignals.length,  color: todaySignals.length  > 0 ? 'text-gtm-orange' : 'text-text-sec' },
          { label: 'Email Replies',   value: emailReplies.length,  color: emailReplies.length  > 0 ? 'text-ok'         : 'text-text-sec' },
          { label: 'Meetings Booked', value: meetingBooked.length, color: meetingBooked.length > 0 ? 'text-warn'       : 'text-text-sec' },
          { label: 'Responded',       value: responded.length,     color: responded.length     > 0 ? 'text-info'       : 'text-text-sec' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-3">
            <div className={`font-display text-2xl ${color}`}>{value}</div>
            <div className="text-xxs text-text-mut font-mono mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Two panels */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Signal feed (50%) ── */}
        <div className="w-1/2 border-r border-bdr flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-bdr/40 bg-bg-s2 shrink-0">
            <span className="text-xxs font-mono text-text-mut uppercase tracking-widest">
              Signal Feed · {allItems.length} total
            </span>
          </div>

          {loading ? (
            <div className="flex-1 p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border border-bdr rounded-lg p-3 animate-pulse space-y-2">
                  <div className="h-3 bg-bg-s2 rounded w-2/3" />
                  <div className="h-2 bg-bg-s2 rounded w-1/2" />
                  <div className="h-8 bg-bg-s2 rounded w-full" />
                </div>
              ))}
            </div>
          ) : allItems.length === 0 ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="w-12 h-12 rounded-full bg-bg-s2 border border-bdr flex items-center justify-center">
                <Activity size={20} className="text-text-mut" />
              </div>
              <div>
                <div className="text-sm font-medium text-text-sec">
                  Nara monitors your Gmail and Calendar daily at 2 PM.
                </div>
                <div className="text-xs text-text-mut mt-2 leading-relaxed max-w-xs">
                  Engagement signals from your pipeline prospects will appear here automatically.
                </div>
                <div className="mt-3 px-3 py-2 bg-warn-light border border-warn/20 rounded-lg inline-block text-left">
                  <div className="text-xxs font-mono text-warn font-medium mb-0.5">Setup required</div>
                  <div className="text-xxs text-warn/80 font-mono">
                    Run <code className="bg-warn/10 px-1 rounded">--setup-oauth</code> to connect Gmail
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {allItems.map(item => (
                <SignalCard
                  key={item.id}
                  signal={item}
                  isSelected={selected?.id === item.id}
                  onSelect={setSelected}
                  onDraft={handleDraft}
                  onDismiss={handleDismiss}
                  dismissing={!!dismissing[item.id]}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Response drafter (50%) ── */}
        <div className="w-1/2 flex flex-col overflow-hidden">

          {draftSignal ? (
            /* Draft mode */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Draft header */}
              <div className="shrink-0 border-b border-bdr px-5 py-3 bg-bg-s1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-base tracking-wide text-text-pri">{draftSignal.company_name}</span>
                      <SignalBadge type={draftSignal.signal_type_nara || draftSignal.status} />
                    </div>
                    {draftSignal.contact_email && (
                      <div className="text-xxs text-text-mut font-mono mt-0.5">{draftSignal.contact_email}</div>
                    )}
                  </div>
                  <button
                    onClick={() => { setDraftSignal(null); setDraftText('') }}
                    className="text-text-mut hover:text-text-pri"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Signal context */}
                {draftSignal.response_notes && (
                  <div className="bg-bg-s2 border border-bdr rounded-lg px-4 py-3">
                    <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-1.5">Signal Context</div>
                    <div className="text-xs text-text-sec leading-relaxed">{draftSignal.response_notes}</div>
                  </div>
                )}

                {/* Draft area */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xxs font-mono text-text-mut uppercase tracking-widest">Draft Response</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRegenerate}
                        disabled={drafting}
                        className="text-xxs font-mono text-text-mut hover:text-text-pri flex items-center gap-1 border border-bdr rounded px-2 py-0.5 transition-colors"
                      >
                        <RotateCcw size={9} className={drafting ? 'animate-spin' : ''} />
                        Regenerate
                      </button>
                      <button
                        onClick={handleCopy}
                        disabled={!draftText || drafting}
                        className="text-xxs font-mono border border-bdr rounded px-2 py-0.5 hover:border-gtm-orange/40 hover:text-gtm-orange transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        {copied
                          ? <><CheckCircle size={9} className="text-ok" /> Copied</>
                          : <><Copy size={9} /> Copy Response</>}
                      </button>
                    </div>
                  </div>

                  {drafting ? (
                    <div className="bg-bg-s2 border border-bdr rounded-lg p-6 flex flex-col items-center gap-3">
                      <Loader2 size={20} className="animate-spin text-gtm-orange" />
                      <div className="text-xs text-text-mut font-mono">Nara is drafting a response…</div>
                    </div>
                  ) : draftError ? (
                    <div className="flex items-start gap-2 p-3 bg-danger/5 border border-danger/20 rounded-lg">
                      <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs text-danger font-medium">Draft failed</div>
                        <div className="text-xs text-danger/80 mt-0.5 whitespace-pre-wrap">{draftError}</div>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      value={draftText}
                      onChange={e => setDraftText(e.target.value)}
                      rows={8}
                      placeholder="Draft will appear here…"
                      className="input-base w-full text-sm leading-relaxed py-3 resize-none"
                    />
                  )}

                  {draftText && !drafting && (
                    <div className="flex items-center gap-1.5 text-xxs font-mono text-text-mut mt-1.5">
                      <CheckCircle size={9} className="text-ok" />
                      Review before sending — nothing auto-sends
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : selected ? (
            /* Detail view of selected signal */
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-xl tracking-wide text-text-pri">{selected.company_name}</div>
                  <SignalBadge type={selected.signal_type_nara || selected.status} />
                </div>
                <button
                  onClick={() => handleDraft(selected)}
                  className="btn-orange text-xs flex items-center gap-1.5 shrink-0"
                >
                  Draft Response
                </button>
              </div>

              {selected.contact_name && (
                <div className="flex items-center gap-1.5 text-xs text-text-sec font-mono">
                  {selected.contact_name}
                  {selected.contact_email && <><span>·</span> {selected.contact_email}</>}
                </div>
              )}

              {selected.response_notes && (
                <div className="bg-bg-s2 border border-bdr rounded-lg px-4 py-3">
                  <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-1.5">Signal Details</div>
                  <div className="text-sm text-text-sec leading-relaxed">{selected.response_notes}</div>
                </div>
              )}

              {selected.message_body && (
                <div className="border border-bdr rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-bg-s2 border-b border-bdr">
                    <span className="text-xxs font-mono text-text-mut">
                      Original Touch {selected.sequence_number} · {selected.channel}
                    </span>
                  </div>
                  <div className="px-4 py-3 text-xs text-text-sec font-mono leading-relaxed whitespace-pre-wrap">
                    {selected.message_body}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Default empty right panel */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-10 h-10 rounded-full bg-bg-s2 border border-bdr flex items-center justify-center">
                <Activity size={18} className="text-text-mut" />
              </div>
              <div>
                <div className="text-sm text-text-sec">Select a signal to draft a response</div>
                <div className="text-xs text-text-mut mt-1">
                  Click "Draft Response" on any signal to generate a contextual follow-up.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, RefreshCw, CheckCircle, X, Loader2,
  TrendingUp, Clock, AlertCircle, Radar,
} from 'lucide-react'
import { fetchProspectSignals, approveSignal, rejectSignal } from '../lib/pip'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nextWednesday() {
  const d = new Date()
  const day = d.getDay() // 0=Sun, 3=Wed
  const daysUntil = (3 - day + 7) % 7 || 7
  d.setDate(d.getDate() + daysUntil)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function icpBadge(score) {
  if (!score) return { cls: 'text-text-mut bg-bg-s2', label: '—' }
  const s = Number(score)
  if (s >= 9)  return { cls: 'text-ok bg-ok-light',       label: `${s}/10` }
  if (s >= 8)  return { cls: 'text-gtm-orange bg-gtm-orange/10', label: `${s}/10` }
  if (s >= 7)  return { cls: 'text-warn bg-warn-light',    label: `${s}/10` }
  return            { cls: 'text-text-mut bg-bg-s2',        label: `${s}/10` }
}

function signalBadge(type) {
  const map = {
    funding: { cls: 'text-info bg-info-light',           label: 'Funding'  },
    hiring:  { cls: 'text-accent bg-accent-light',       label: 'Hiring'   },
    social:  { cls: 'text-ok bg-ok-light/60',            label: 'Social'   },
    news:    { cls: 'text-warn bg-warn-light',           label: 'News'     },
    product: { cls: 'text-gtm-orange bg-gtm-orange/10', label: 'Product'  },
  }
  const key = (type || '').toLowerCase()
  return map[key] || { cls: 'text-text-mut bg-bg-s2', label: type || 'Signal' }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed bottom-5 right-5 z-50 bg-text-pri text-white text-sm px-4 py-3 rounded-lg shadow-card-hover flex items-center gap-2 animate-in">
      <CheckCircle size={14} className="text-ok shrink-0" />
      {msg}
    </div>
  )
}

const TABS = ['All', 'Pending', 'Approved', 'Rejected']

// ─── Main view ────────────────────────────────────────────────────────────────
export default function PipView() {
  const navigate = useNavigate()
  const [signals, setSignals]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab]           = useState('Pending')
  const [acting, setActing]     = useState({}) // { [id]: 'approve' | 'reject' }
  const [toast, setToast]       = useState(null)

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true)
    try {
      const data = await fetchProspectSignals()
      setSignals(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  // ── Derived ──────────────────────────────────────────────────────────────
  const thisWeek = (() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7)
    return signals.filter(s => new Date(s.created_at) >= cutoff).length
  })()

  const pending  = signals.filter(s => s.status === 'pending').length
  const approved = signals.filter(s => s.status === 'approved').length
  const inPipe   = approved // approved = added to pipeline

  const lastScan = signals.length > 0
    ? new Date(signals[0].created_at).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : null

  const filtered = signals.filter(s =>
    tab === 'All' ? true : s.status === tab.toLowerCase()
  )

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleApprove = async (signal) => {
    if (acting[signal.id]) return
    setActing(a => ({ ...a, [signal.id]: 'approve' }))
    try {
      await approveSignal(signal)
      await load(true)
      setToast(`${signal.company_name} added to pipeline ✅`)
    } catch (e) {
      setToast(`Error: ${e.message}`)
    } finally {
      setActing(a => { const n = { ...a }; delete n[signal.id]; return n })
    }
  }

  const handleReject = async (signal) => {
    if (acting[signal.id]) return
    setActing(a => ({ ...a, [signal.id]: 'reject' }))
    try {
      await rejectSignal(signal.id)
      await load(true)
    } catch (e) { console.error(e) }
    finally {
      setActing(a => { const n = { ...a }; delete n[signal.id]; return n })
    }
  }

  const handleResearch = (signal) => {
    navigate(`/rex?search=${encodeURIComponent(signal.company_name)}`)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">

      {/* Toast */}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-bdr shrink-0">
        <Radar size={14} className="text-gtm-orange" />
        <span className="font-display text-lg tracking-wide">PIP</span>
        <span className="text-text-mut text-xs font-mono">— Prospector</span>
        {lastScan && (
          <span className="text-xxs font-mono text-text-mut ml-1">
            · Last scan: {lastScan}
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
          { label: 'Signals This Week', value: thisWeek, color: 'text-text-pri' },
          { label: 'Pending Review',    value: pending,  color: pending  > 0 ? 'text-warn' : 'text-text-sec' },
          { label: 'Approved',          value: approved, color: approved > 0 ? 'text-ok'   : 'text-text-sec' },
          { label: 'Added to Pipeline', value: inPipe,   color: inPipe   > 0 ? 'text-gtm-orange' : 'text-text-sec' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-3">
            <div className={`font-display text-2xl ${color}`}>{value}</div>
            <div className="text-xxs text-text-mut font-mono mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-5 border-b border-bdr shrink-0">
        {TABS.map(t => {
          const count = t === 'All' ? signals.length
            : signals.filter(s => s.status === t.toLowerCase()).length
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-xs font-mono whitespace-nowrap transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'text-gtm-orange border-gtm-orange'
                  : 'text-text-mut border-transparent hover:text-text-sec'
              }`}
            >
              {t}
              {count > 0 && (
                <span className={`ml-1.5 text-xxs px-1 py-0.5 rounded ${
                  tab === t ? 'bg-accent-light text-gtm-orange' : 'bg-bg-s2 text-text-mut'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-5 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-bg-s2 rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
            <div className="w-12 h-12 rounded-full bg-bg-s2 border border-bdr flex items-center justify-center">
              <Radar size={20} className="text-text-mut" />
            </div>
            <div>
              {signals.length === 0 ? (
                <>
                  <div className="text-sm font-medium text-text-sec">Pip runs every Wednesday at 7 AM.</div>
                  <div className="text-xs text-text-mut mt-1">
                    Next scan: <span className="text-gtm-orange font-mono">{nextWednesday()}</span>
                  </div>
                  <div className="text-xs text-text-mut mt-0.5">Signals will appear here automatically.</div>
                </>
              ) : (
                <div className="text-sm text-text-sec">
                  No {tab.toLowerCase()} signals.
                </div>
              )}
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-bg-s1 border-b border-bdr">
              <tr>
                {['Company', 'Signal Type', 'ICP Score', 'Source', 'Date', 'Description', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xxs font-mono text-text-mut uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-bdr/40">
              {filtered.map(s => {
                const icp = icpBadge(s.icp_score)
                const sig = signalBadge(s.signal_type)
                const date = s.signal_date
                  ? new Date(s.signal_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : s.created_at
                    ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—'
                const isActing = !!acting[s.id]

                return (
                  <tr key={s.id} className="hover:bg-bg-s2/60 transition-colors">
                    {/* Company */}
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-text-pri">{s.company_name}</div>
                      {s.company_domain && (
                        <div className="text-xxs text-text-mut font-mono">{s.company_domain}</div>
                      )}
                    </td>

                    {/* Signal type */}
                    <td className="px-4 py-3">
                      <span className={`text-xxs font-mono px-1.5 py-0.5 rounded font-medium ${sig.cls}`}>
                        {sig.label}
                      </span>
                    </td>

                    {/* ICP Score */}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded font-medium ${icp.cls}`}>
                        {icp.label}
                      </span>
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3 text-xs text-text-mut font-mono">
                      {s.signal_source || '—'}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-text-mut font-mono whitespace-nowrap">
                      {date}
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3 max-w-xs">
                      <div className="text-xs text-text-sec line-clamp-2 leading-snug">
                        {s.signal_description || '—'}
                      </div>
                      {s.recommended_entry && (
                        <div className="text-xxs font-mono text-gtm-orange mt-0.5">
                          → {s.recommended_entry}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {s.status === 'pending' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleApprove(s)}
                            disabled={isActing}
                            title="Add to Pipeline"
                            className="flex items-center gap-1 text-xxs font-mono px-2 py-1 bg-ok-light text-ok border border-ok/20 rounded hover:bg-ok/10 transition-colors disabled:opacity-50"
                          >
                            {acting[s.id] === 'approve'
                              ? <Loader2 size={9} className="animate-spin" />
                              : <CheckCircle size={9} />}
                            Pipeline
                          </button>
                          <button
                            onClick={() => handleResearch(s)}
                            title="Research in Rex"
                            className="flex items-center gap-1 text-xxs font-mono px-2 py-1 bg-info-light text-info border border-info/20 rounded hover:bg-info/10 transition-colors"
                          >
                            <Search size={9} />
                            Research
                          </button>
                          <button
                            onClick={() => handleReject(s)}
                            disabled={isActing}
                            title="Reject"
                            className="flex items-center gap-1 text-xxs font-mono px-2 py-1 bg-danger-light text-danger border border-danger/20 rounded hover:bg-danger/10 transition-colors disabled:opacity-50"
                          >
                            {acting[s.id] === 'reject'
                              ? <Loader2 size={9} className="animate-spin" />
                              : <X size={9} />}
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className={`text-xxs font-mono ${
                          s.status === 'approved' ? 'text-ok' :
                          s.status === 'rejected' ? 'text-text-mut' : 'text-text-mut'
                        }`}>
                          {s.status === 'approved' ? '✓ In pipeline' : '✗ Rejected'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

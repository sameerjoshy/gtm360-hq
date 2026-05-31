import { useEffect, useState, useCallback } from 'react'
import {
  TrendingUp, RefreshCw, ChevronLeft, ChevronRight,
  Send, Loader2, CheckCircle, AlertCircle, ArrowRight,
} from 'lucide-react'
import {
  fetchTrendReports, normaliseItems,
  sendToAndy, sendAllToAndy, nextMonday, shiftWeek,
} from '../lib/aria'

// ─── Topic cards ──────────────────────────────────────────────────────────────

function EmergingCard({ item, onSend, sending }) {
  return (
    <div className="card p-3.5 space-y-2 border-l-2 border-ok">
      <div className="text-sm font-medium text-text-pri leading-snug">{item.title}</div>
      {item.description && (
        <div className="text-xs text-text-sec leading-relaxed">{item.description}</div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {item.source && (
          <span className="text-xxs font-mono px-1.5 py-0.5 rounded bg-info-light text-info">
            {item.source}
          </span>
        )}
        {item.hook && (
          <span className="text-xxs italic text-text-mut">{item.hook}</span>
        )}
      </div>
      <button
        onClick={() => onSend(item)}
        disabled={sending}
        className="flex items-center gap-1.5 text-xxs font-mono text-ok hover:text-ok/80 transition-colors disabled:opacity-50"
      >
        {sending
          ? <Loader2 size={9} className="animate-spin" />
          : <ArrowRight size={9} />}
        Send to Andy
      </button>
    </div>
  )
}

function CrowdedCard({ item }) {
  return (
    <div className="card p-3.5 space-y-2 border-l-2 border-danger/50 opacity-75">
      <div className="text-sm font-medium text-text-sec leading-snug line-through decoration-danger/40">
        {item.title}
      </div>
      {item.description && (
        <div className="text-xs text-text-mut leading-relaxed">{item.description}</div>
      )}
      <span className="inline-block text-xxs font-mono px-1.5 py-0.5 rounded bg-danger-light text-danger">
        Avoid this angle
      </span>
    </div>
  )
}

function GapCard({ item, onSend, sending }) {
  return (
    <div className="card p-3.5 space-y-2 border-l-2 border-gtm-orange">
      <div className="text-sm font-medium text-text-pri leading-snug">{item.title}</div>
      {item.description && (
        <div className="text-xs text-text-sec leading-relaxed">{item.description}</div>
      )}
      <button
        onClick={() => onSend(item)}
        disabled={sending}
        className="flex items-center gap-1.5 text-xxs font-mono text-gtm-orange hover:text-gtm-orange/80 transition-colors disabled:opacity-50"
      >
        {sending
          ? <Loader2 size={9} className="animate-spin" />
          : <ArrowRight size={9} />}
        Send to Andy
      </button>
    </div>
  )
}

// ─── Column header ────────────────────────────────────────────────────────────
function ColHeader({ label, count, color, bg }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${bg}`}>
      <span className={`text-xxs font-mono uppercase tracking-widest font-bold ${color}`}>{label}</span>
      <span className={`text-xxs font-mono ${color} opacity-60`}>{count}</span>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed bottom-5 right-5 z-50 bg-text-pri text-white text-sm px-4 py-3 rounded-lg shadow-card-hover flex items-center gap-2">
      <CheckCircle size={14} className="text-ok shrink-0" />
      {msg}
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function AriaView() {
  const [reports, setReports]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(null) // YYYY-MM-DD
  const [toast, setToast]         = useState(null)
  const [sending, setSending]     = useState({}) // { [key]: true }
  const [sendingAll, setSendingAll] = useState(false)
  const [sendError, setSendError]   = useState(null)

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true)
    try {
      const data = await fetchTrendReports()
      setReports(data)
      // Default to latest week
      if (data.length > 0 && !currentWeek) {
        setCurrentWeek(data[0].week_of)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [currentWeek])

  useEffect(() => { load() }, [])

  // ── Current report ────────────────────────────────────────────────────────
  const report = reports.find(r => r.week_of === currentWeek) || null

  const emerging = normaliseItems(report?.emerging)
  const crowded  = normaliseItems(report?.crowded)
  const gaps     = normaliseItems(report?.gaps)
  const rawObs   = normaliseItems(report?.raw_observations)

  const weekLabel = currentWeek
    ? new Date(currentWeek + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : '—'

  const generatedAt = report?.generated_at
    ? new Date(report.generated_at).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : null

  // Week navigation
  const prevWeek = () => {
    if (!currentWeek) return
    const prev = shiftWeek(currentWeek, -1)
    // Only navigate if report exists for that week
    const exists = reports.find(r => r.week_of === prev)
    if (exists) setCurrentWeek(prev)
  }

  const nextWeek = () => {
    if (!currentWeek) return
    const next = shiftWeek(currentWeek, +1)
    const exists = reports.find(r => r.week_of === next)
    if (exists) setCurrentWeek(next)
  }

  const hasPrev = currentWeek && reports.some(r => r.week_of === shiftWeek(currentWeek, -1))
  const hasNext = currentWeek && reports.some(r => r.week_of === shiftWeek(currentWeek, +1))

  // ── Send helpers ──────────────────────────────────────────────────────────
  const handleSendItem = async (item, prefix = '') => {
    const key = `${prefix}${item.id}`
    setSending(s => ({ ...s, [key]: true }))
    setSendError(null)
    try {
      const text = item.title + (item.description ? ` — ${item.description}` : '')
      await sendToAndy(text)
      setToast("Sent to Andy's queue ✅")
    } catch (e) {
      setSendError(e.message)
    } finally {
      setSending(s => { const n = { ...s }; delete n[key]; return n })
    }
  }

  const handleSendObs = async (item) => {
    const key = `obs_${item.id}`
    setSending(s => ({ ...s, [key]: true }))
    setSendError(null)
    try {
      const text = item.title + (item.description ? ` — ${item.description}` : '')
      await sendToAndy(text)
      setToast("Sent to Andy's queue ✅")
    } catch (e) {
      setSendError(e.message)
    } finally {
      setSending(s => { const n = { ...s }; delete n[key]; return n })
    }
  }

  const handleSendAll = async () => {
    if (sendingAll || !report?.raw_observations) return
    setSendingAll(true)
    setSendError(null)
    try {
      const count = await sendAllToAndy(report.raw_observations)
      setToast(`${count} observations sent to Andy ✅`)
    } catch (e) {
      setSendError(e.message)
    } finally {
      setSendingAll(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">

      {/* Toast */}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-bdr shrink-0">
        <TrendingUp size={14} className="text-gtm-orange" />
        <span className="font-display text-lg tracking-wide">ARIA</span>
        <span className="text-text-mut text-xs font-mono">— Trend Research</span>
        {currentWeek && (
          <span className="text-xxs font-mono text-text-mut ml-1">
            · Week of {weekLabel}
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

      {/* Week navigator */}
      {reports.length > 0 && (
        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-bdr bg-bg-s1 shrink-0">
          <button
            onClick={prevWeek}
            disabled={!hasPrev}
            className="flex items-center gap-1 text-xs text-text-mut hover:text-text-pri disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={13} /> Prev Week
          </button>
          <div className="flex-1 text-center">
            <span className="text-xs font-mono text-text-sec">{weekLabel}</span>
            {generatedAt && (
              <span className="text-xxs text-text-mut font-mono ml-2">· generated {generatedAt}</span>
            )}
          </div>
          <button
            onClick={nextWeek}
            disabled={!hasNext}
            className="flex items-center gap-1 text-xs text-text-mut hover:text-text-pri disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next Week <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* Error banner */}
      {sendError && (
        <div className="mx-5 mt-3 flex items-start gap-2 px-3 py-2 bg-danger/5 border border-danger/20 rounded-lg shrink-0">
          <AlertCircle size={13} className="text-danger mt-0.5 shrink-0" />
          <span className="text-xs text-danger">{sendError}</span>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-5 grid grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-24 bg-bg-s2 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !report ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
            <div className="w-12 h-12 rounded-full bg-bg-s2 border border-bdr flex items-center justify-center">
              <TrendingUp size={20} className="text-text-mut" />
            </div>
            <div>
              <div className="text-sm font-medium text-text-sec">Aria runs every Monday at 7 AM.</div>
              <div className="text-xs text-text-mut mt-1">
                Next report: <span className="text-gtm-orange font-mono">{nextMonday()}</span>
              </div>
              <div className="text-xs text-text-mut mt-0.5">Trend data will appear here automatically.</div>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-6">

            {/* Three-column grid */}
            <div className="grid grid-cols-3 gap-4">

              {/* Emerging */}
              <div>
                <ColHeader
                  label="Emerging"
                  count={emerging.length}
                  color="text-ok"
                  bg="bg-ok-light"
                />
                <div className="space-y-2 mt-2">
                  {emerging.length === 0 ? (
                    <div className="text-xs text-text-mut italic px-1">No emerging topics this week.</div>
                  ) : emerging.map(item => (
                    <EmergingCard
                      key={item.id}
                      item={item}
                      onSend={i => handleSendItem(i, 'em_')}
                      sending={!!sending[`em_${item.id}`]}
                    />
                  ))}
                </div>
              </div>

              {/* Crowded */}
              <div>
                <ColHeader
                  label="Crowded"
                  count={crowded.length}
                  color="text-danger"
                  bg="bg-danger-light"
                />
                <div className="space-y-2 mt-2">
                  {crowded.length === 0 ? (
                    <div className="text-xs text-text-mut italic px-1">No crowded topics identified.</div>
                  ) : crowded.map(item => (
                    <CrowdedCard key={item.id} item={item} />
                  ))}
                </div>
              </div>

              {/* Gaps */}
              <div>
                <ColHeader
                  label="Gaps"
                  count={gaps.length}
                  color="text-gtm-orange"
                  bg="bg-gtm-orange/10"
                />
                <div className="space-y-2 mt-2">
                  {gaps.length === 0 ? (
                    <div className="text-xs text-text-mut italic px-1">No gaps identified.</div>
                  ) : gaps.map(item => (
                    <GapCard
                      key={item.id}
                      item={item}
                      onSend={i => handleSendItem(i, 'gap_')}
                      sending={!!sending[`gap_${item.id}`]}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Raw observations */}
            {rawObs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xxs font-mono text-text-mut uppercase tracking-widest">
                    Raw Observations · {rawObs.length}
                  </div>
                  <button
                    onClick={handleSendAll}
                    disabled={sendingAll}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gtm-orange text-white rounded-md hover:bg-gtm-orange/90 transition-colors font-medium disabled:opacity-50"
                  >
                    {sendingAll
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Send size={11} />}
                    Send All to Andy
                  </button>
                </div>

                <div className="border border-bdr rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-bg-s2 border-b border-bdr">
                      <tr>
                        {['Observation', 'Source', 'Action'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-xxs font-mono text-text-mut uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bdr/40">
                      {rawObs.map(item => (
                        <tr key={item.id} className="hover:bg-bg-s2/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-text-pri max-w-lg">
                            <div className="leading-snug">{item.title}</div>
                            {item.description && (
                              <div className="text-xs text-text-mut mt-0.5">{item.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xxs font-mono text-text-mut whitespace-nowrap">
                            {item.source || 'Aria'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleSendObs(item)}
                              disabled={!!sending[`obs_${item.id}`]}
                              className="flex items-center gap-1 text-xxs font-mono text-gtm-orange hover:text-gtm-orange/80 disabled:opacity-50 transition-colors"
                            >
                              {sending[`obs_${item.id}`]
                                ? <Loader2 size={9} className="animate-spin" />
                                : <ArrowRight size={9} />}
                              Send to Andy
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

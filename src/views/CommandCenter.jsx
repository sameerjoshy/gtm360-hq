import { Flag, ChevronRight, Circle, Clock, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import { fmt$, getCompanyName } from '../lib/supabase'

// ─── Skeleton block ───────────────────────────────────────────────────────────
function Skel({ className = '' }) {
  return <div className={`bg-bg-s2 rounded-lg animate-pulse ${className}`} />
}

function SkeletonScreen() {
  return (
    <div className="p-5 space-y-4 max-w-[1400px]">
      <Skel className="h-[88px]" />
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skel key={i} className="h-[72px]" />)}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skel key={i} className="h-60" />)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => <Skel key={i} className="h-44" />)}
      </div>
      <Skel className="h-16" />
    </div>
  )
}

// ─── Metric card ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card px-4 py-3 text-left hover:border-gtm-orange/40 hover:bg-bg-s2/40 transition-all cursor-pointer group"
    >
      <div className={`font-display text-2xl tracking-wide transition-transform group-hover:translate-x-0.5 ${color || 'text-text-pri'}`}>
        {value}
      </div>
      <div className="text-xs text-text-sec mt-0.5">{label}</div>
      {sub && <div className="text-xxs text-text-mut font-mono mt-0.5">{sub}</div>}
    </button>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function Bar({ pct, color }) {
  return (
    <div className="progress-track flex-1">
      <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  )
}

// ─── ICP dot ─────────────────────────────────────────────────────────────────
function IcpDot({ fit }) {
  const c = { Strong: '#00E676', Moderate: '#FFD600', 'Non-ICP': '#FF1744' }
  return (
    <span
      className="w-1.5 h-1.5 rounded-full shrink-0 inline-block"
      style={{ background: c[fit] || '#55556A' }}
      title={`ICP: ${fit || 'Unknown'}`}
    />
  )
}

// ─── Signal indicator ─────────────────────────────────────────────────────────
function SignalPip({ signal }) {
  if (!signal) return <span className="w-1.5 h-1.5 shrink-0" />
  const isWatch = /watch|stale|cold/i.test(signal)
  return (
    <span
      className="w-1.5 h-1.5 rounded-full shrink-0 inline-block"
      style={{ background: isWatch ? '#FFD600' : 'transparent' }}
      title={signal}
    />
  )
}

// ─── Content status badge ────────────────────────────────────────────────────
function StatusPill({ status }) {
  const styles = {
    review:    'badge-warn',
    drafting:  'badge-muted',
    raw:       'badge-muted',
    approved:  'badge-green',
    published: 'badge-green',
  }
  return <span className={styles[status] || 'badge-muted'}>{status}</span>
}

// ─── Panel header ────────────────────────────────────────────────────────────
function PanelHead({ title, nav, onClick }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-bdr">
      <span className="text-xs font-medium text-text-pri">{title}</span>
      {nav && (
        <button
          onClick={onClick}
          className="text-xxs text-text-mut hover:text-gtm-orange flex items-center gap-0.5 transition-colors cursor-pointer"
        >
          {nav} <ChevronRight size={10} />
        </button>
      )}
    </div>
  )
}

// ─── Safe JSONB → array helper ───────────────────────────────────────────────
// Supabase JSONB columns may come back as null, [], or {} depending on how they
// were inserted. This normalises all three to a plain JS array.
function toArr(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'object') return Object.values(val)
  return []
}

// ─── Main view ───────────────────────────────────────────────────────────────
export default function CommandCenter() {
  const navigate = useNavigate()
  const { brief, deals, okrs, content, finance, loading, lastRefresh } = useAppStore()

  // ── Derived data ──
  const totalPipeline = deals.reduce((s, d) => s + (d.amount || 0), 0)
  const staleDeals    = deals.filter(d => (d.days_in_stage || 0) > 14)
  const reviewCount   = content.filter(c => c.status === 'review').length

  const now = new Date()
  const mtdRevenue  = finance
    .filter(f => {
      if (f.status !== 'paid' || !f.payment_date) return false
      const p = new Date(f.payment_date)
      return p.getMonth() === now.getMonth() && p.getFullYear() === now.getFullYear()
    })
    .reduce((s, f) => s + (f.amount || 0), 0)

  const outstanding = finance
    .filter(f => f.status === 'sent' || f.status === 'overdue')
    .reduce((s, f) => s + (f.amount || 0), 0)

  // OKR objectives rolled up
  const objectives = [...new Set(okrs.map(k => k.objective_number))]
    .sort()
    .map(n => {
      const krs   = okrs.filter(k => k.objective_number === n)
      const total = krs.reduce((s, k) => s + (k.kr_target  || 0), 0)
      const curr  = krs.reduce((s, k) => s + (k.kr_current || 0), 0)
      const pct   = total > 0 ? Math.round((curr / total) * 100) : 0
      return { n, krs, pct }
    })

  // Format brief date
  const briefDate = brief?.brief_date
    ? new Date(brief.brief_date).toLocaleDateString('en-US', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
    : null

  const lastSyncStr = lastRefresh
    ? lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null

  // Show skeleton only on very first load (no data yet)
  if (loading && !brief && deals.length === 0) return <SkeletonScreen />

  return (
    <div className="p-5 space-y-4 max-w-[1400px]">

      {/* ── ONE THING ── */}
      {brief ? (
        <div className="card p-4 border-l-4 border-gtm-orange">
          <div className="flex items-start gap-6">

            {/* Brief text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-xxs font-mono text-gtm-orange uppercase tracking-widest">One Thing</span>
                {briefDate && (
                  <span className="text-xxs font-mono text-text-mut bg-bg-s2 border border-bdr px-2 py-0.5 rounded">
                    {briefDate}
                  </span>
                )}
              </div>
              <p className="text-sm text-text-pri leading-relaxed">{brief.one_thing}</p>
            </div>

            {/* Divider */}
            <div className="border-l border-bdr self-stretch shrink-0" />

            {/* Priority actions */}
            <div className="w-[260px] shrink-0">
              <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-2">
                Priority Actions
              </div>
              <ol className="space-y-2">
                {toArr(brief.priority_actions).slice(0, 3).map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-sec">
                    <span className="text-gtm-orange font-mono font-bold shrink-0">{i + 1}.</span>
                    <span className="leading-relaxed">
                      {typeof a === 'string' ? a : a.action || JSON.stringify(a)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

          </div>
        </div>
      ) : (
        <div className="card p-4 border-l-4 border-bdr">
          <div className="text-xs text-text-mut">
            No brief loaded. Navigate to Sam and run <span className="font-mono text-gtm-orange">/today</span> to generate today's brief.
          </div>
        </div>
      )}

      {/* ── METRICS ROW ── */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard
          label="Total Pipeline"
          value={fmt$(totalPipeline)}
          sub={`${deals.length} live deals`}
          color="text-gtm-orange"
          onClick={() => navigate('/rex')}
        />
        <MetricCard
          label="Stale Deals"
          value={staleDeals.length}
          sub=">14 days no activity"
          color={staleDeals.length > 0 ? 'text-warn' : 'text-ok'}
          onClick={() => navigate('/rex')}
        />
        <MetricCard
          label="Awaiting Review"
          value={reviewCount}
          sub="content drafts"
          color={reviewCount > 0 ? 'text-info' : 'text-text-sec'}
          onClick={() => navigate('/andy')}
        />
        <MetricCard
          label="MTD Revenue"
          value={fmt$(mtdRevenue)}
          sub={outstanding > 0 ? `${fmt$(outstanding)} outstanding` : '$0 outstanding'}
          color={mtdRevenue > 0 ? 'text-ok' : 'text-text-sec'}
          onClick={() => navigate('/finn')}
        />
      </div>

      {/* ── THREE COLUMNS ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Pipeline (Rex) */}
        <div className="card p-0 overflow-hidden">
          <PanelHead title="Pipeline" nav="Rex" onClick={() => navigate('/rex')} />
          <div className="divide-y divide-bdr">
            {deals.slice(0, 6).map((d, i) => (
              <button
                key={i}
                onClick={() => navigate('/rex')}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-bg-s2 text-left transition-colors cursor-pointer"
              >
                <IcpDot   fit={d.icp_fit} />
                <SignalPip signal={d.signal} />
                <span className="text-xs text-text-pri flex-1 truncate">{getCompanyName(d)}</span>
                <span className="badge-muted mr-1">{d.service_line}</span>
                <span className="text-xs font-mono text-text-sec">{fmt$(d.amount)}</span>
              </button>
            ))}
            {deals.length > 6 && (
              <button
                onClick={() => navigate('/rex')}
                className="w-full px-4 py-2 text-xxs text-text-mut hover:text-gtm-orange text-center transition-colors cursor-pointer"
              >
                +{deals.length - 6} more →
              </button>
            )}
            {deals.length === 0 && (
              <div className="px-4 py-6 text-xs text-text-mut text-center">No deals in pipeline</div>
            )}
          </div>
        </div>

        {/* Today (Sam) */}
        <div className="card p-0 overflow-hidden">
          <PanelHead title="Today" nav="Sam" onClick={() => navigate('/sam')} />
          <div className="p-4 space-y-4">

            {/* Meetings */}
            <div>
              <div className="text-xxs font-mono text-text-mut mb-2">MEETINGS</div>
              {toArr(brief?.meetings).length > 0 ? (
                <div className="space-y-1.5">
                  {toArr(brief.meetings).slice(0, 3).map((m, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-text-sec">
                      <Clock size={11} className="text-text-mut shrink-0 mt-0.5" />
                      <span>{typeof m === 'string' ? m : m.title || m.name || JSON.stringify(m)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-text-mut">No meetings scheduled</div>
              )}
            </div>

            {/* Pipeline pulse */}
            <div>
              <div className="text-xxs font-mono text-text-mut mb-1.5">PIPELINE PULSE</div>
              <div className="font-mono text-sm text-text-pri">
                {fmt$(totalPipeline)}
                <span className="text-text-mut text-xs ml-1">/ {deals.length} deals</span>
              </div>
              {staleDeals.length > 0 && (
                <div className="text-xxs font-mono text-warn mt-0.5">
                  {staleDeals.length} stale
                </div>
              )}
            </div>

            {/* Actions */}
            <button
              onClick={() => navigate('/sam')}
              className="btn-primary w-full text-center text-xs cursor-pointer"
            >
              Start Staff Meeting
            </button>
          </div>
        </div>

        {/* System (Ola) */}
        <div className="card p-0 overflow-hidden">
          <PanelHead title="System" nav="Ola" onClick={() => navigate('/ola')} />
          <div className="p-4 space-y-4">

            {/* Agents */}
            <div>
              <div className="text-xxs font-mono text-text-mut mb-2">AGENTS</div>
              <div className="space-y-1.5">
                {[
                  { name: 'Sam', role: 'CoS' },
                  { name: 'Rex', role: 'CRO' },
                  { name: 'Andy', role: 'CMO' },
                  { name: 'Finn', role: 'CFO' },
                  { name: 'Ola',  role: 'COO' },
                ].map(({ name, role }) => (
                  <div key={name} className="flex items-center gap-2">
                    <Circle size={6} className="fill-ok text-ok shrink-0" />
                    <span className="text-xs text-text-sec flex-1">{name}</span>
                    <span className="text-xxs font-mono text-text-mut">{role}</span>
                    <span className="text-xxs font-mono text-ok">Live</span>
                  </div>
                ))}
              </div>
            </div>

            {/* OKR health */}
            {objectives.length > 0 && (
              <div>
                <div className="text-xxs font-mono text-text-mut mb-2">OKR HEALTH</div>
                <div className="space-y-1.5">
                  {objectives.map(o => (
                    <div key={o.n} className="flex items-center gap-2">
                      <span className="text-xxs font-mono text-text-mut w-5">O{o.n}</span>
                      <Bar
                        pct={o.pct}
                        color={o.pct === 0 ? '#FF1744' : o.pct < 50 ? '#FFD600' : '#00E676'}
                      />
                      <span className="text-xxs font-mono text-text-mut w-8 text-right">{o.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last sync */}
            {lastSyncStr && (
              <div className="text-xxs font-mono text-text-mut border-t border-bdr pt-2">
                Last sync: {lastSyncStr}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM TWO COLUMNS ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Content Queue (Andy) */}
        <div className="card p-0 overflow-hidden">
          <PanelHead title="Content Queue" nav="Andy" onClick={() => navigate('/andy')} />
          {content.length === 0 ? (
            <div className="px-4 py-6 text-xs text-text-mut text-center">
              No content items. Capture an observation in Andy.
            </div>
          ) : (
            <div className="divide-y divide-bdr">
              {content.slice(0, 4).map((c, i) => {
                const preview = c.raw_observation || c.draft || ''
                return (
                  <button
                    key={i}
                    onClick={() => navigate('/andy')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-s2 text-left transition-colors cursor-pointer"
                  >
                    <FileText size={12} className="text-text-mut shrink-0" />
                    <span className="text-xs text-text-pri flex-1 truncate">
                      {preview.slice(0, 48)}{preview.length > 48 ? '…' : ''}
                    </span>
                    {c.qc_score != null && (
                      <span className="badge-orange text-xxs shrink-0">{c.qc_score}/10</span>
                    )}
                    <StatusPill status={c.status} />
                  </button>
                )
              })}
              {content.length > 4 && (
                <button
                  onClick={() => navigate('/andy')}
                  className="w-full px-4 py-2 text-xxs text-text-mut hover:text-gtm-orange text-center transition-colors cursor-pointer"
                >
                  +{content.length - 4} more →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Finance (Finn) */}
        <div className="card p-0 overflow-hidden">
          <PanelHead title="Finance" nav="Finn" onClick={() => navigate('/finn')} />
          <div className="p-4 space-y-3">

            {/* MTD + Outstanding */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xxs font-mono text-text-mut">MTD REVENUE</div>
                <div className="font-display text-xl text-text-pri mt-0.5">{fmt$(mtdRevenue)}</div>
              </div>
              <div>
                <div className="text-xxs font-mono text-text-mut">OUTSTANDING</div>
                <div className={`font-display text-xl mt-0.5 ${outstanding > 0 ? 'text-warn' : 'text-text-pri'}`}>
                  {fmt$(outstanding)}
                </div>
              </div>
            </div>

            {/* Invoice list */}
            {finance.length > 0 ? (
              <div className="space-y-1 border-t border-bdr pt-2">
                {finance.slice(0, 3).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-text-sec flex-1 truncate">
                      {f.client_name || f.record_type || 'Invoice'}
                    </span>
                    <span className="font-mono text-text-sec shrink-0">{fmt$(f.amount)}</span>
                    <span className={
                      f.status === 'paid'    ? 'badge-green'  :
                      f.status === 'overdue' ? 'badge-danger' :
                      f.status === 'sent'    ? 'badge-warn'   : 'badge-muted'
                    }>
                      {f.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-mut border-t border-bdr pt-2">No invoices yet</div>
            )}

            {/* Pricing reference */}
            <div className="text-xxs font-mono text-text-mut border-t border-bdr pt-2">
              DIAG $3K–$8K · FCRO $5K–$20K/mo · ROPS $4K–$15K
            </div>
          </div>
        </div>
      </div>

      {/* ── SAM'S FLAG ── */}
      {brief?.sams_flag && (
        <div className="card p-4 border-l-4 border-danger flex items-start gap-3">
          <Flag size={14} className="text-danger shrink-0 mt-0.5" />
          <div>
            <div className="text-xxs font-mono text-danger uppercase tracking-widest mb-1.5">
              Sam's Flag
            </div>
            <p className="text-sm text-text-pri leading-relaxed">{brief.sams_flag}</p>
          </div>
        </div>
      )}

    </div>
  )
}

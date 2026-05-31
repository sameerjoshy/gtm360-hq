import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, RefreshCw, Loader2, CheckCircle,
  AlertTriangle, Info, X, Shield, Zap,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  fetchCleanupReports, scanPipeline, saveCleanupReport,
  applyFix, resolveIssue, healthScore, scoreColor,
} from '../lib/cleo'

// ─── Severity config ──────────────────────────────────────────────────────────
const SEV = {
  critical: {
    label:   'Critical',
    cls:     'text-danger bg-danger-light',
    border:  'border-l-danger',
    header:  'bg-danger-light',
    headerText: 'text-danger',
    icon:    AlertTriangle,
  },
  warning: {
    label:   'Warning',
    cls:     'text-warn bg-warn-light',
    border:  'border-l-warn',
    header:  'bg-warn-light',
    headerText: 'text-warn',
    icon:    AlertTriangle,
  },
  info: {
    label:   'Info',
    cls:     'text-text-sec bg-bg-s2',
    border:  'border-l-bdr',
    header:  'bg-bg-s2',
    headerText: 'text-text-mut',
    icon:    Info,
  },
}

const ISSUE_LABELS = {
  missing_domain:   'Missing Domain',
  missing_close_date: 'Missing Close Date',
  zero_amount:      'No Amount Set',
  unknown_stage:    'Unknown Stage',
  stale_deal:       'Stale Deal',
  duplicate_company:'Duplicate Company',
  non_icp_active:   'Non-ICP Active',
  missing_contact:  'Missing Contact',
}

// ─── Issue card ───────────────────────────────────────────────────────────────
function IssueCard({ issue, reportId, onResolved }) {
  const sev = SEV[issue.severity] || SEV.info
  const Icon = sev.icon
  const [applying, setApplying]   = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [done, setDone]           = useState(issue.resolved)
  const [msg, setMsg]             = useState('')
  const hasAutoFix = !!(issue.deal_id && issue.field && issue.new_value)

  const handleApply = async () => {
    setApplying(true)
    try {
      const result = await applyFix(issue)
      await resolveIssue(reportId, issue.id)
      setMsg(result.reason)
      setDone(true)
      onResolved()
    } catch (e) {
      setMsg(`Error: ${e.message}`)
    } finally {
      setApplying(false)
    }
  }

  const handleDismiss = async () => {
    setDismissing(true)
    try {
      await resolveIssue(reportId, issue.id)
      setDone(true)
      onResolved()
    } catch (e) {
      setMsg(`Error: ${e.message}`)
    } finally {
      setDismissing(false)
    }
  }

  if (done) return null // Hide resolved issues

  return (
    <div className={`card p-3.5 border-l-2 ${sev.border} space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Icon size={13} className={`${sev.headerText} shrink-0 mt-0.5`} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-medium text-text-pri">{issue.company_name}</span>
              <span className={`text-xxs font-mono px-1 py-0.5 rounded ${sev.cls}`}>
                {ISSUE_LABELS[issue.issue_type] || issue.issue_type}
              </span>
            </div>
            <div className="text-xs text-text-sec mt-0.5 leading-snug">{issue.description}</div>
          </div>
        </div>
      </div>

      <div className="bg-bg-s2 border border-bdr rounded px-2.5 py-2">
        <div className="text-xxs font-mono text-text-mut mb-0.5">Suggested fix</div>
        <div className="text-xs text-text-sec">{issue.suggested_fix}</div>
      </div>

      {msg && (
        <div className="text-xxs font-mono text-ok flex items-center gap-1">
          <CheckCircle size={9} />{msg}
        </div>
      )}

      <div className="flex items-center gap-2">
        {hasAutoFix && (
          <button
            onClick={handleApply}
            disabled={applying || dismissing}
            className="flex items-center gap-1.5 text-xxs font-mono px-2 py-1 bg-ok-light text-ok border border-ok/20 rounded hover:bg-ok/10 transition-colors disabled:opacity-50"
          >
            {applying ? <Loader2 size={9} className="animate-spin" /> : <CheckCircle size={9} />}
            ✅ Apply Fix
          </button>
        )}
        <button
          onClick={handleDismiss}
          disabled={applying || dismissing}
          className="flex items-center gap-1.5 text-xxs font-mono px-2 py-1 border border-bdr rounded hover:border-danger/40 hover:text-danger text-text-mut transition-colors disabled:opacity-50"
        >
          {dismissing ? <Loader2 size={9} className="animate-spin" /> : <X size={9} />}
          ❌ Dismiss
        </button>
      </div>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────
function IssueSection({ severity, issues, reportId, onResolved }) {
  const sev = SEV[severity]
  const Icon = sev.icon
  const visible = issues.filter(i => !i.resolved)
  if (visible.length === 0) return null

  return (
    <div>
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg ${sev.header} mb-2`}>
        <Icon size={12} className={sev.headerText} />
        <span className={`text-xxs font-mono uppercase tracking-widest font-bold ${sev.headerText}`}>
          {sev.label}
        </span>
        <span className={`text-xxs font-mono ${sev.headerText} opacity-60 ml-auto`}>
          {visible.length}
        </span>
      </div>
      <div className="space-y-2">
        {visible.map(issue => (
          <IssueCard
            key={issue.id}
            issue={issue}
            reportId={reportId}
            onResolved={onResolved}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Health score display ─────────────────────────────────────────────────────
function HealthScoreCard({ report }) {
  const score = healthScore(report)
  const color = scoreColor(score)
  const bgBar = score >= 80 ? 'bg-ok' : score >= 60 ? 'bg-warn' : 'bg-danger'

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-6">
        <div>
          <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-1">
            CRM Health Score
          </div>
          <div className={`font-display text-5xl leading-none ${color}`}>
            {score}%
          </div>
          <div className="text-xs text-text-sec mt-2">
            {report.issues_found === 0
              ? '✓ All records clean'
              : `${report.issues_found} issues — ${report.critical_count} critical, ${report.warning_count} warnings, ${report.info_count} info`}
          </div>
        </div>

        <div className="flex-1 max-w-48">
          {/* Score bar */}
          <div className="w-full h-2 bg-bg-s2 rounded-full overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${bgBar}`}
              style={{ width: `${score}%` }}
            />
          </div>
          <div className="flex justify-between text-xxs font-mono text-text-mut mt-1">
            <span>0</span><span>50</span><span>100</span>
          </div>

          {/* Breakdown */}
          <div className="mt-3 space-y-1">
            {[
              { label: 'Critical', count: report.critical_count, color: 'text-danger' },
              { label: 'Warnings', count: report.warning_count,  color: 'text-warn'   },
              { label: 'Info',     count: report.info_count,     color: 'text-text-mut' },
              { label: 'Resolved', count: report.resolved_count, color: 'text-ok'     },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center justify-between text-xxs font-mono">
                <span className="text-text-mut">{label}</span>
                <span className={color}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function CleoView() {
  const [reports, setReports]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [scanning, setScanning]   = useState(false)
  const [scanError, setScanError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [resolveCount, setResolveCount] = useState(0) // trigger re-render

  const load = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true)
    try {
      const data = await fetchCleanupReports()
      setReports(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [])

  // Latest report
  const report = reports[0] || null
  const issues = (report?.report_data?.issues || [])

  const criticals = issues.filter(i => i.severity === 'critical')
  const warnings  = issues.filter(i => i.severity === 'warning')
  const infos     = issues.filter(i => i.severity === 'info')

  const lastScan = report?.created_at
    ? new Date(report.created_at).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : null

  // ── Manual scan ─────────────────────────────────────────────────────────────
  const handleScan = async () => {
    if (scanning) return
    setScanning(true)
    setScanError(null)
    try {
      // Fetch pipeline deals
      const { data: deals, error } = await supabase
        .from('pipeline_snapshot')
        .select('*')
        .neq('gtm360_record_type', 'Lost')

      if (error) throw new Error(error.message)

      const issues = scanPipeline(deals || [])
      await saveCleanupReport(issues)
      await load(true)
    } catch (e) {
      setScanError(e.message || 'Scan failed — please retry.')
    } finally {
      setScanning(false)
    }
  }

  const onResolved = () => {
    setResolveCount(c => c + 1)
    // Refresh report data after a short delay
    setTimeout(() => load(true), 500)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-bdr shrink-0">
        <Shield size={14} className="text-gtm-orange" />
        <span className="font-display text-lg tracking-wide">CLEO</span>
        <span className="text-text-mut text-xs font-mono">— CRM Quality</span>
        {lastScan && (
          <span className="text-xxs font-mono text-text-mut ml-1">· Last scan: {lastScan}</span>
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
        <button
          onClick={handleScan}
          disabled={scanning}
          className="btn-orange text-xs flex items-center gap-1.5"
        >
          {scanning
            ? <><Loader2 size={11} className="animate-spin" /> Scanning…</>
            : <><Zap size={11} /> Run Manual Scan</>}
        </button>
      </div>

      {/* Scan error */}
      {scanError && (
        <div className="mx-5 mt-3 shrink-0 flex items-start gap-2 px-3 py-2 bg-danger/5 border border-danger/20 rounded-lg">
          <AlertTriangle size={13} className="text-danger mt-0.5 shrink-0" />
          <span className="text-xs text-danger">{scanError}</span>
        </div>
      )}

      {/* Scanning overlay bar */}
      {scanning && (
        <div className="mx-5 mt-3 shrink-0 flex items-center gap-3 px-4 py-3 bg-bg-s2 border border-bdr rounded-lg">
          <Loader2 size={14} className="animate-spin text-gtm-orange shrink-0" />
          <div className="space-y-0.5">
            <div className="text-xs font-medium text-text-pri">Cleo is scanning your pipeline…</div>
            <div className="text-xxs text-text-mut font-mono">
              Checking for missing data, stale deals, duplicates, non-ICP records
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {loading ? (
          <div className="space-y-3">
            <div className="h-28 bg-bg-s2 rounded-lg animate-pulse" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-bg-s2 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !report ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
            <div className="w-14 h-14 rounded-full bg-bg-s2 border border-bdr flex items-center justify-center">
              <ShieldCheck size={24} className="text-text-mut" />
            </div>
            <div>
              <div className="text-sm font-medium text-text-sec">Cleo runs every Monday at 8 AM.</div>
              <div className="text-xs text-text-mut mt-1 leading-relaxed max-w-sm">
                Your CRM health report will appear here.
                <br />
                All fixes require your approval — Cleo never changes data automatically.
              </div>
            </div>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="btn-orange text-xs flex items-center gap-1.5 mt-2"
            >
              <Zap size={11} /> Run First Scan Now
            </button>
          </div>
        ) : (
          <>
            {/* Health score card */}
            <HealthScoreCard report={report} />

            {/* Issue sections */}
            {issues.length === 0 || issues.every(i => i.resolved) ? (
              <div className="card p-6 text-center">
                <ShieldCheck size={24} className="text-ok mx-auto mb-2" />
                <div className="text-sm font-medium text-ok">Pipeline is clean</div>
                <div className="text-xs text-text-mut mt-1">No open issues found.</div>
              </div>
            ) : (
              <>
                <IssueSection severity="critical" issues={criticals} reportId={report.id} onResolved={onResolved} />
                <IssueSection severity="warning"  issues={warnings}  reportId={report.id} onResolved={onResolved} />
                <IssueSection severity="info"     issues={infos}     reportId={report.id} onResolved={onResolved} />
              </>
            )}

            {/* Past reports */}
            {reports.length > 1 && (
              <div>
                <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-2">Past Reports</div>
                <div className="space-y-1.5">
                  {reports.slice(1, 5).map(r => {
                    const s = healthScore(r)
                    const c = scoreColor(s)
                    return (
                      <div key={r.id} className="flex items-center gap-3 text-xs card p-2.5">
                        <span className={`font-display text-base ${c}`}>{s}%</span>
                        <span className="text-text-sec flex-1">{r.report_date}</span>
                        <span className="text-text-mut font-mono">{r.issues_found} issues</span>
                        <span className="text-ok font-mono">{r.resolved_count} resolved</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

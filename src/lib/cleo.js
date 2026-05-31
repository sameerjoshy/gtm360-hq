/**
 * cleo.js — CRM Cleanup Agent
 *
 * Scans pipeline_snapshot for data quality issues.
 * Proposes specific fixes. Never changes data without approval.
 *
 * Issue severity:
 *   critical — blocks accurate reporting (missing amount, unknown stage)
 *   warning  — degrades pipeline quality (stale, missing close_date)
 *   info     — worth noting but not urgent (non-ICP, missing contact)
 */

import { supabase } from './supabase'

// ─── Known stage values ───────────────────────────────────────────────────────
const KNOWN_STAGES = new Set([
  'appointmentscheduled',
  'qualifiedtobuy',
  'presentationscheduled',
  'decisionmakerboughtin',
  'contractsent',
  'closedwon',
  'closedlost',
])

const NON_ICP_COMPANIES = ['Make', 'Tracxn']

// ─── Fetch reports ────────────────────────────────────────────────────────────
export async function fetchCleanupReports() {
  const { data, error } = await supabase
    .from('cleanup_reports')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function fetchLatestReport() {
  const { data, error } = await supabase
    .from('cleanup_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data
}

/** For Ola health panel — quick summary */
export async function fetchCrmHealthSummary() {
  const report = await fetchLatestReport()
  if (!report) return null
  return {
    score:         healthScore(report),
    issuesFound:   report.issues_found,
    criticalCount: report.critical_count,
    warningCount:  report.warning_count,
    reportDate:    report.report_date,
  }
}

// ─── Health score ─────────────────────────────────────────────────────────────
export function healthScore(report) {
  if (!report) return null
  const deductions =
    (report.critical_count || 0) * 10 +
    (report.warning_count  || 0) * 5  +
    (report.info_count     || 0) * 2
  return Math.max(0, 100 - deductions)
}

export function scoreColor(score) {
  if (score === null || score === undefined) return 'text-text-mut'
  if (score >= 80) return 'text-ok'
  if (score >= 60) return 'text-warn'
  return 'text-danger'
}

// ─── Pipeline scanner ─────────────────────────────────────────────────────────
function makeIssue(deal, severity, type, description, suggestedFix, field = null, newValue = null) {
  return {
    id:           `${deal.deal_id || deal.company_name}-${type}`,
    severity,
    company_name:  deal.company_name || deal.deal_name || 'Unknown',
    deal_id:       deal.deal_id || null,
    issue_type:    type,
    description,
    suggested_fix: suggestedFix,
    field,
    new_value:     newValue,
    resolved:      false,
  }
}

/**
 * scanPipeline(deals)
 * Runs all data quality checks against pipeline_snapshot records.
 * Returns array of issue objects.
 */
export function scanPipeline(deals) {
  const issues = []
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Track company names for duplicate detection
  const nameCounts = {}
  deals.forEach(d => {
    const name = (d.company_name || d.deal_name || '').trim().toLowerCase()
    if (name) nameCounts[name] = (nameCounts[name] || 0) + 1
  })

  for (const deal of deals) {
    const co = deal.company_name || deal.deal_name || 'Unknown'

    // 1. Missing company_domain
    if (!deal.company_domain) {
      issues.push(makeIssue(deal, 'critical', 'missing_domain',
        `${co} has no company domain — research and update in HubSpot`,
        `Find ${co}'s website and add domain to HubSpot deal`,
        'company_domain', null
      ))
    }

    // 2. Missing close_date
    if (!deal.close_date) {
      issues.push(makeIssue(deal, 'warning', 'missing_close_date',
        `${co} has no close date set`,
        'Set a realistic close date in HubSpot based on current stage',
        'close_date', null
      ))
    }

    // 3. Amount = 0 or null
    if (!deal.amount || deal.amount === 0) {
      issues.push(makeIssue(deal, 'critical', 'zero_amount',
        `${co} has no deal value set`,
        'Update amount in HubSpot based on service line pricing',
        'amount', null
      ))
    }

    // 4. Unknown stage
    if (deal.stage && !KNOWN_STAGES.has(deal.stage)) {
      issues.push(makeIssue(deal, 'warning', 'unknown_stage',
        `${co} has unrecognised stage: "${deal.stage}"`,
        `Move to one of the known stages: Radar/Connected/Engaged/Discovery/Proposal`,
        'stage', 'appointmentscheduled'
      ))
    }

    // 5. Stale — not touched in 30+ days
    if (deal.last_activity_date) {
      const lastActivity = new Date(deal.last_activity_date)
      if (lastActivity < thirtyDaysAgo) {
        const daysStale = Math.floor((Date.now() - lastActivity.getTime()) / 86400000)
        issues.push(makeIssue(deal, 'warning', 'stale_deal',
          `${co} hasn't been touched in ${daysStale} days`,
          `Log an activity in HubSpot or move to a holding stage if not active`,
          null, null
        ))
      }
    }

    // 6. Duplicate company
    const nameLower = (deal.company_name || deal.deal_name || '').trim().toLowerCase()
    if (nameLower && nameCounts[nameLower] > 1) {
      // Only flag once per company (not once per duplicate deal)
      if (deals.findIndex(d =>
        (d.company_name || d.deal_name || '').trim().toLowerCase() === nameLower
      ) === deals.indexOf(deal)) {
        issues.push(makeIssue(deal, 'warning', 'duplicate_company',
          `${co} appears ${nameCounts[nameLower]} times in pipeline — possible duplicate deals`,
          'Review and merge or close duplicate deals in HubSpot',
          null, null
        ))
      }
    }

    // 7. Non-ICP company still active
    const isNonIcp = NON_ICP_COMPANIES.some(name =>
      co.toLowerCase().includes(name.toLowerCase())
    ) || deal.icp_fit === 'Non-ICP'
    if (isNonIcp && deal.stage !== 'closedlost') {
      issues.push(makeIssue(deal, 'info', 'non_icp_active',
        `${co} is Non-ICP but still in active pipeline`,
        'Review if this deal should be closed-lost or moved to a different track',
        null, null
      ))
    }

    // 8. Missing contact info
    if (!deal.contact_name && !deal.contact_email) {
      issues.push(makeIssue(deal, 'info', 'missing_contact',
        `${co} has no contact name or email`,
        'Find the right contact via LinkedIn and add to HubSpot',
        null, null
      ))
    }
  }

  return issues
}

// ─── Save report ──────────────────────────────────────────────────────────────
export async function saveCleanupReport(issues) {
  const critical = issues.filter(i => i.severity === 'critical').length
  const warning  = issues.filter(i => i.severity === 'warning').length
  const info     = issues.filter(i => i.severity === 'info').length

  const row = {
    report_date:    new Date().toISOString().slice(0, 10),
    issues_found:   issues.length,
    critical_count: critical,
    warning_count:  warning,
    info_count:     info,
    report_data:    { issues },
    status:         issues.length === 0 ? 'clean' : 'pending',
    resolved_count: 0,
  }

  const { data, error } = await supabase
    .from('cleanup_reports')
    .insert(row)
    .select('id')
    .single()

  if (error) throw new Error(`Save failed: ${error.message}`)

  try {
    await supabase.from('automation_log').insert({
      agent_name:      'Cleo',
      automation_name: 'crm_scan',
      trigger_type:    'manual',
      status:          'ok',
      output_summary:  `${issues.length} issues — ${critical} critical, ${warning} warnings`,
    })
  } catch { /* non-fatal */ }

  return data.id
}

// ─── Apply a fix ──────────────────────────────────────────────────────────────
/**
 * applyFix(issue)
 * Only applies if the issue has a deal_id and a known field+value.
 * Returns { applied: boolean, reason: string }
 */
export async function applyFix(issue) {
  if (!issue.deal_id || !issue.field || !issue.new_value) {
    return { applied: false, reason: 'No automated fix available — update manually in HubSpot.' }
  }

  const { error } = await supabase
    .from('pipeline_snapshot')
    .update({ [issue.field]: issue.new_value })
    .eq('deal_id', issue.deal_id)

  if (error) throw new Error(error.message)
  return { applied: true, reason: `Updated ${issue.field} in pipeline_snapshot.` }
}

/** Mark an issue resolved in the report */
export async function resolveIssue(reportId, issueId) {
  // Fetch current report
  const { data: report, error: fetchErr } = await supabase
    .from('cleanup_reports')
    .select('report_data, resolved_count')
    .eq('id', reportId)
    .single()

  if (fetchErr) throw new Error(fetchErr.message)

  const issues = report.report_data?.issues || []
  const updated = issues.map(i => i.id === issueId ? { ...i, resolved: true } : i)
  const resolvedCount = updated.filter(i => i.resolved).length

  const { error } = await supabase
    .from('cleanup_reports')
    .update({
      report_data:    { ...report.report_data, issues: updated },
      resolved_count: resolvedCount,
      status:         resolvedCount === issues.length ? 'clean' : 'pending',
    })
    .eq('id', reportId)

  if (error) throw new Error(error.message)
}

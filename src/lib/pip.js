/**
 * pip.js — Prospector Agent helpers
 *
 * Reads from prospect_signals (written by Python automation, Wednesdays 7 AM).
 * Approve → inserts into pipeline_snapshot as a new Live deal.
 * Reject → marks signal rejected.
 */

import { supabase } from './supabase'

// ─── Fetch signals ───────────────────────────────────────────────────────────────
export async function fetchProspectSignals() {
  const { data, error } = await supabase
    .from('prospect_signals')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function countPendingSignals() {
  const { count, error } = await supabase
    .from('prospect_signals')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (error) return 0
  return count || 0
}

// ─── Actions ─────────────────────────────────────────────────────────────────────

/**
 * approveSignal(signal)
 * Marks signal approved and creates a Live deal in pipeline_snapshot.
 */
export async function approveSignal(signal) {
  // 1. Update signal status
  const { error: sigErr } = await supabase
    .from('prospect_signals')
    .update({ status: 'approved', sameer_decision: 'approved' })
    .eq('id', signal.id)

  if (sigErr) throw new Error(`Signal update failed: ${sigErr.message}`)

  // 2. Build pipeline_snapshot row
  const serviceLine = signal.recommended_entry || 'DIAG'
  const dealName    = `${signal.company_name} — ${serviceLine}`
  const today       = new Date().toISOString().slice(0, 10)

  const deal = {
    deal_name:            dealName,
    company_name:         signal.company_name,
    company_domain:       signal.company_domain || null,
    stage:                'appointmentscheduled',  // Radar
    amount:               serviceLine === 'FCRO' ? 10000 : serviceLine === 'ROPS' ? 8000 : 5000,
    icp_score:            signal.icp_score || null,
    icp_fit:              signal.icp_score >= 8 ? 'Strong' : signal.icp_score >= 6 ? 'Moderate' : 'Non-ICP',
    service_line:         serviceLine,
    signal:               'new',
    gtm360_record_type:   'Live',
    snapshot_date:        today,
    last_activity_date:   today,
    days_in_stage:        0,
  }

  const { error: pipeErr } = await supabase
    .from('pipeline_snapshot')
    .insert(deal)

  if (pipeErr) throw new Error(`Pipeline insert failed: ${pipeErr.message}`)

  // 3. Audit log
  try {
    await supabase.from('automation_log').insert({
      agent_name:      'Pip',
      automation_name: 'prospect_approved',
      trigger_type:    'manual',
      status:          'ok',
      output_summary:  `${signal.company_name} → pipeline (${serviceLine})`,
    })
  } catch { /* non-fatal */ }
}

/**
 * rejectSignal(id)
 * Marks signal rejected.
 */
export async function rejectSignal(id) {
  const { error } = await supabase
    .from('prospect_signals')
    .update({ status: 'rejected', sameer_decision: 'rejected' })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

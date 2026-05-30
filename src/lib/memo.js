/**
 * memo.js — Meeting Intelligence Agent
 *
 * Uses Cloudflare Workers AI (llama-3.3-70b) to extract structured intel
 * from meeting notes: commitments, signals, objections, next steps, stage rec,
 * follow-up email draft, and CRM update draft.
 *
 * Human gate: follow-up email and CRM update require explicit approval.
 * Nothing writes to HubSpot automatically.
 */

import { supabase } from './supabase'

// ─── Stage mapping ──────────────────────────────────────────────────────────────
const STAGE_MAP = {
  Radar:     'appointmentscheduled',
  Connected: 'qualifiedtobuy',
  Engaged:   'presentationscheduled',
  Discovery: 'decisionmakerboughtin',
  Proposal:  'contractsent',
}

// ─── System prompt ──────────────────────────────────────────────────────────────
const MEMO_SYSTEM = `You are Memo, Meeting Intelligence agent at GTM360 HQ.
Extract structured intelligence from meeting notes.
Output ONLY valid JSON, no markdown, no code fences, no explanation.

Extract this exact JSON structure:
{
  "commitments_by_sameer": ["string — what Sameer committed to do"],
  "commitments_by_prospect": ["string — what the prospect committed to do"],
  "buying_signals": ["string — positive indicator observed"],
  "objections_raised": ["string — concern or blocker raised"],
  "pain_points_confirmed": ["string — business pain confirmed in conversation"],
  "next_steps": ["string — specific next action with owner and timing"],
  "deal_stage_recommendation": "Radar|Connected|Engaged|Discovery|Proposal",
  "confidence": "HIGH|MEDIUM|LOW",
  "followup_subject": "string — email subject line",
  "followup_body": "string — under 150 words, peer to peer tone, specific to this conversation"
}

Rules:
- Be specific to what was actually said — no generic observations
- Buying signals must be real indicators (budget, timeline, authority, clear pain)
- Objections must be actual concerns raised, not hypothetical
- Next steps must have a clear owner (Sameer / prospect name)
- Follow-up email opens with a specific reference to the conversation
- If notes are too sparse, set confidence to LOW and explain in objections_raised`

// ─── CF Workers AI call ─────────────────────────────────────────────────────────
async function callCfAI(messages, signal) {
  const accountId = import.meta.env.VITE_CF_ACCOUNT_ID
  const apiToken  = import.meta.env.VITE_CF_API_TOKEN

  if (!accountId || !apiToken) {
    throw new Error(
      'Add VITE_CF_ACCOUNT_ID and VITE_CF_API_TOKEN to .env.local to enable Memo.\n' +
      'Get them at: dash.cloudflare.com → AI → Workers AI'
    )
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`

  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ messages }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg  = body?.errors?.[0]?.message || body?.result?.response || `CF AI error ${res.status}`
    throw new Error(msg)
  }

  const data = await res.json()
  if (!data.success) {
    throw new Error(data?.errors?.[0]?.message || 'CF AI returned failure')
  }

  return data.result?.response || ''
}

// ─── Step helpers ───────────────────────────────────────────────────────────────
function makeSteps() {
  return [
    { id: 'extract',  label: 'Extracting intelligence…',  status: 'pending' },
    { id: 'followup', label: 'Drafting follow-up email…',  status: 'pending' },
    { id: 'crm',      label: 'Preparing CRM update draft…', status: 'pending' },
  ]
}

function updateStep(setSteps, id, status, label) {
  setSteps(prev => prev.map(s =>
    s.id === id ? { ...s, status, ...(label ? { label } : {}) } : s
  ))
}

// ─── Main: analyze meeting notes ────────────────────────────────────────────────
/**
 * analyzeMeeting({ transcript, companyName, meetingDate, dealId }, setSteps, signal)
 * Returns { intel, crmDraft } — not yet saved.
 */
export async function analyzeMeeting(params, setSteps, signal) {
  const { transcript, companyName, meetingDate } = params

  if (!transcript?.trim()) throw new Error('Meeting notes are required.')

  const steps = makeSteps()
  setSteps(steps)

  // ── Step 1: Extract intelligence ────────────────────────────────────────────
  updateStep(setSteps, 'extract', 'running')

  const context = [
    companyName  ? `Company: ${companyName}` : null,
    meetingDate  ? `Meeting date: ${meetingDate}` : null,
  ].filter(Boolean).join('\n')

  const userContent = `${context ? context + '\n\n' : ''}Meeting notes:\n\n${transcript.trim()}`

  const rawResponse = await callCfAI([
    { role: 'system', content: MEMO_SYSTEM },
    { role: 'user',   content: userContent },
  ], signal)

  // Parse JSON — strip any accidental markdown fences
  let intel
  try {
    const cleaned = rawResponse
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    // Extract JSON object if surrounded by prose
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    intel = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned)
  } catch {
    throw new Error('Memo returned invalid JSON — please retry with more detailed notes.')
  }

  updateStep(setSteps, 'extract', 'done', `${(intel.buying_signals || []).length} signals · ${(intel.objections_raised || []).length} objections`)

  // ── Step 2: Follow-up draft (already in intel) ──────────────────────────────
  updateStep(setSteps, 'followup', 'running')
  // followup_subject + followup_body already extracted above
  if (!intel.followup_subject) intel.followup_subject = `Follow-up — ${companyName || 'our conversation'}`
  if (!intel.followup_body)   intel.followup_body   = 'No follow-up generated. Please add notes and retry.'
  updateStep(setSteps, 'followup', 'done', 'Follow-up email drafted')

  // ── Step 3: Build CRM update draft ─────────────────────────────────────────
  updateStep(setSteps, 'crm', 'running')

  const stageRec   = intel.deal_stage_recommendation || 'Radar'
  const hsStage    = STAGE_MAP[stageRec] || 'appointmentscheduled'
  const today      = meetingDate || new Date().toISOString().slice(0, 10)
  const nextStep   = intel.next_steps?.[0] || 'Schedule follow-up'
  const summary    = [
    intel.pain_points_confirmed?.slice(0, 2).join('. '),
    intel.buying_signals?.slice(0, 1)[0],
  ].filter(Boolean).join(' ') || `Meeting with ${companyName} on ${today}.`

  const crmDraft = {
    dealstage:          hsStage,
    last_activity_date: today,
    hs_next_step:       nextStep,
    description:        summary.slice(0, 400),
  }

  updateStep(setSteps, 'crm', 'done', 'CRM update draft ready')

  return { intel, crmDraft }
}

// ─── Persistence ────────────────────────────────────────────────────────────────

/**
 * saveMeetingIntel(params, intel, crmDraft)
 * Saves to meeting_intel table. Returns saved row id.
 */
export async function saveMeetingIntel(params, intel, crmDraft) {
  const { transcript, companyName, contactNames, meetingDate, dealId } = params

  const row = {
    meeting_date:             meetingDate || new Date().toISOString().slice(0, 10),
    company_name:             companyName || null,
    contact_names:            contactNames?.filter(Boolean) || [],
    deal_id:                  dealId || null,
    raw_notes:                transcript,
    commitments_by_sameer:    intel.commitments_by_sameer    || [],
    commitments_by_prospect:  intel.commitments_by_prospect  || [],
    buying_signals:           intel.buying_signals            || [],
    objections_raised:        intel.objections_raised         || [],
    pain_points_confirmed:    intel.pain_points_confirmed     || [],
    next_steps:               intel.next_steps                || [],
    deal_stage_recommendation: intel.deal_stage_recommendation || 'Radar',
    followup_subject:         intel.followup_subject          || null,
    followup_body:            intel.followup_body             || null,
    crm_update_draft:         crmDraft                        || null,
    confidence:               intel.confidence                || 'MEDIUM',
    followup_approved:        false,
    crm_update_approved:      false,
  }

  const { data, error } = await supabase
    .from('meeting_intel')
    .insert(row)
    .select('id')
    .single()

  if (error) throw new Error(`Save failed: ${error.message}`)

  // Audit log (non-fatal)
  try {
    await supabase.from('automation_log').insert({
      agent_name:      'Memo',
      automation_name: 'meeting_intel_extracted',
      trigger_type:    'manual',
      status:          'ok',
      output_summary:  `${companyName} · ${intel.deal_stage_recommendation} · ${intel.confidence}`,
    })
  } catch { /* non-fatal */ }

  return data.id
}

/** Approve follow-up email (marks for human action — nothing auto-sends) */
export async function approveFollowUp(id) {
  const { error } = await supabase
    .from('meeting_intel')
    .update({ followup_approved: true })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

/** Approve CRM update (saves decision — Phase 2 will push to HubSpot) */
export async function approveCrmUpdate(id) {
  const { error } = await supabase
    .from('meeting_intel')
    .update({ crm_update_approved: true, crm_updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)

  try {
    await supabase.from('automation_log').insert({
      agent_name:      'Memo',
      automation_name: 'crm_update_approved',
      trigger_type:    'manual',
      status:          'ok',
      output_summary:  `meeting_intel_id: ${id}`,
    })
  } catch { /* non-fatal */ }
}

/** Update follow-up email text (before approval) */
export async function updateFollowUp(id, subject, body) {
  const { error } = await supabase
    .from('meeting_intel')
    .update({ followup_subject: subject, followup_body: body })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

/** Fetch all meetings, newest first */
export async function fetchMeetingIntel() {
  const { data, error } = await supabase
    .from('meeting_intel')
    .select(`
      id, meeting_date, company_name, contact_names, deal_id,
      deal_stage_recommendation, confidence,
      commitments_by_sameer, commitments_by_prospect,
      buying_signals, objections_raised, pain_points_confirmed, next_steps,
      followup_subject, followup_body, followup_approved,
      crm_update_draft, crm_update_approved, crm_updated_at,
      created_at
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

/** Count meetings processed this week (for Ola health panel) */
export async function countMeetingsThisWeek() {
  const monday = new Date()
  monday.setDate(monday.getDate() - monday.getDay() + 1)
  monday.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('meeting_intel')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', monday.toISOString())

  if (error) return 0
  return count || 0
}

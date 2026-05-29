/**
 * memo.js — Meeting Intel Agent
 *
 * Analyzes a call transcript and extracts structured intelligence:
 * commitments, buying signals, objections, next steps, stage recommendation,
 * follow-up email draft, CRM notes, and Sam brief update.
 *
 * Human gate: Follow-up email and CRM update require explicit approval
 * before the user acts on them. Nothing sends automatically.
 */

import { supabase } from './supabase'

// ─── Claude system prompt ───────────────────────────────────────────────────────

const MEMO_SYSTEM = `You are Memo, the Meeting Intel analyst for GTM360. After every client or prospect call, you analyze the transcript or call notes and extract structured intelligence for the CRO and Chief of Staff.

Your job:
1. Extract commitments — what was promised, by whom, by when
2. Identify buying signals — positive indicators with strength and exact quote
3. Flag objections — obstacles raised with a suggested response
4. Clarify next steps — specific actions with owners and due dates
5. Recommend deal stage — based on what you heard, where should this deal move?
6. Draft follow-up email — professional, specific, max 150 words, sent from "Sameer at GTM-360"
7. Write CRM notes — factual, for HubSpot deal record, max 100 words
8. Write Sam brief update — one sentence for the next morning brief

Rules:
- Be specific to what was actually said — no generic observations
- Buying signal strength: HIGH (explicit budget/timeline/authority), MEDIUM (interest/engagement), LOW (curiosity only)
- Stage recommendations use: Radar, Connected, Engaged, Discovery, Proposal, Active
- Follow-up email opens with a specific reference to the conversation
- If the transcript is too short/vague, flag it in stage_change_rationale

Output ONLY valid JSON — no prose, no markdown fences, no explanation:

{
  "company_name": "string",
  "contact_name": "string or null",
  "meeting_type": "discovery | check_in | proposal | demo | other",
  "commitments": [
    { "who": "string", "what": "string", "by_when": "string or null" }
  ],
  "buying_signals": [
    { "signal": "string", "strength": "HIGH | MEDIUM | LOW", "quote": "string or null" }
  ],
  "objections": [
    { "objection": "string", "response_suggested": "string" }
  ],
  "next_steps": [
    { "action": "string", "owner": "string", "due_date": "string or null" }
  ],
  "deal_stage_recommended": "string or null",
  "stage_change_rationale": "string or null",
  "follow_up_email_subject": "string",
  "follow_up_email_body": "string",
  "crm_update_notes": "string",
  "sam_brief_update": "string"
}`

// ─── Step tracker ───────────────────────────────────────────────────────────────

function makeStep(id, label, status = 'pending') {
  return { id, label, status }
}

function updateStep(setSteps, id, status, label) {
  setSteps(prev => prev.map(s =>
    s.id === id ? { ...s, status, ...(label ? { label } : {}) } : s
  ))
}

// ─── Main: analyze transcript ───────────────────────────────────────────────────

/**
 * analyzeMeeting(params, setSteps, signal)
 *
 * @param {object} params        — { transcript, companyName, contactName, meetingDate, meetingType, dealId }
 * @param {function} setSteps    — React state setter for step progress
 * @param {AbortSignal} signal   — AbortController signal
 * @returns {object}             — Parsed Memo intel object (not yet saved)
 */
export async function analyzeMeeting(params, setSteps, signal) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your-anthropic-api-key-here') {
    throw new Error('Add VITE_ANTHROPIC_API_KEY to .env.local to enable Memo.')
  }

  const { transcript, companyName, contactName, meetingDate, meetingType } = params

  if (!transcript?.trim()) throw new Error('Transcript is required.')

  // ── Steps ──────────────────────────────────────────────────────────────────
  const steps = [
    makeStep('read',   'Reading transcript…'),
    makeStep('claude', 'Memo extracting intel…',    'pending'),
    makeStep('parse',  'Parsing structured output…', 'pending'),
  ]
  setSteps(steps)

  updateStep(setSteps, 'read', 'running')

  const context = [
    companyName  ? `Company: ${companyName}` : null,
    contactName  ? `Contact: ${contactName}` : null,
    meetingDate  ? `Date: ${meetingDate}` : null,
    meetingType  ? `Meeting type: ${meetingType}` : null,
  ].filter(Boolean).join('\n')

  const prompt = `${context ? context + '\n\n' : ''}Transcript / call notes:\n\n${transcript.trim()}`
  updateStep(setSteps, 'read', 'done', `${transcript.trim().split(/\s+/).length} words read`)

  // ── Claude call ─────────────────────────────────────────────────────────────
  updateStep(setSteps, 'claude', 'running', 'Memo extracting intel…')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'x-api-key':                                 apiKey,
      'anthropic-version':                         '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type':                              'application/json',
    },
    body: JSON.stringify({
      model:      'claude-opus-4-7',
      max_tokens: 4096,
      stream:     false,
      thinking:   { type: 'adaptive' },
      system:     MEMO_SYSTEM,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message || `Claude API error ${res.status}`)
  }

  const data = await res.json()
  updateStep(setSteps, 'claude', 'done', 'Intel extracted')

  // ── Parse ───────────────────────────────────────────────────────────────────
  updateStep(setSteps, 'parse', 'running')

  const textBlock = data.content?.find(b => b.type === 'text')
  if (!textBlock?.text) throw new Error('Claude returned no text content')

  let parsed
  try {
    const cleaned = textBlock.text
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Claude returned invalid JSON — please retry')
  }

  updateStep(setSteps, 'parse', 'done', 'Structured intel ready')

  return parsed
}

// ─── Persistence ────────────────────────────────────────────────────────────────

/**
 * saveMeetingNote(params, intel)
 * Saves raw transcript + extracted intel to meeting_notes.
 * Returns the saved row id.
 */
export async function saveMeetingNote(params, intel) {
  const { transcript, companyName, contactName, meetingDate, meetingType, dealId } = params

  const row = {
    deal_id:                 dealId || null,
    company_name:            intel.company_name || companyName,
    contact_name:            intel.contact_name || contactName || null,
    meeting_date:            meetingDate || new Date().toISOString().slice(0, 10),
    meeting_type:            intel.meeting_type || meetingType || 'discovery',
    transcript,
    commitments:             intel.commitments            || [],
    buying_signals:          intel.buying_signals         || [],
    objections:              intel.objections             || [],
    next_steps:              intel.next_steps             || [],
    deal_stage_recommended:  intel.deal_stage_recommended || null,
    stage_change_rationale:  intel.stage_change_rationale || null,
    follow_up_email_subject: intel.follow_up_email_subject|| null,
    follow_up_email_body:    intel.follow_up_email_body   || null,
    crm_update_notes:        intel.crm_update_notes       || null,
    sam_brief_update:        intel.sam_brief_update       || null,
    status:                  'extracted',
    created_by:              'Memo',
  }

  const { data, error } = await supabase
    .from('meeting_notes')
    .insert(row)
    .select('id')
    .single()

  if (error) throw new Error(`Save failed: ${error.message}`)
  return data.id
}

/** Approve a meeting note (human has reviewed and confirmed) */
export async function approveMeetingNote(id) {
  const { error } = await supabase
    .from('meeting_notes')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)

  // Audit log
  try {
    await supabase.from('automation_log').insert({
      agent_name:      'Memo',
      automation_name: 'meeting_note_approved',
      trigger_type:    'manual',
      status:          'ok',
      output_summary:  `note_id: ${id}`,
    })
  } catch { /* non-fatal */ }
}

/** Fetch all meeting notes, newest first */
export async function fetchMeetingNotes() {
  const { data, error } = await supabase
    .from('meeting_notes')
    .select('id, company_name, contact_name, meeting_date, meeting_type, status, approved_at, created_at, deal_stage_recommended, sam_brief_update, buying_signals, next_steps, commitments, objections, follow_up_email_subject, follow_up_email_body, crm_update_notes, stage_change_rationale')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

/** Update email body (inline edit before approve) */
export async function updateFollowUp(id, subject, body) {
  const { error } = await supabase
    .from('meeting_notes')
    .update({ follow_up_email_subject: subject, follow_up_email_body: body })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

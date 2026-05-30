/**
 * oz.js — Outreach Execution Agent
 *
 * Generates a personalised 5-touch outreach sequence using Cloudflare Workers AI.
 * Writes touches to outreach_queue in Supabase.
 *
 * Human gate: nothing ever sends without explicit approve → send in OzView.
 *
 * Touch schedule:
 *   1 (Day 1)  — LinkedIn connection request (<300 chars, no pitch)
 *   2 (Day 3)  — LinkedIn DM (<150 words, value-add, no ask)
 *   3 (Day 7)  — Email (<100 words, specific format)
 *   4 (Day 14) — LinkedIn follow-up (<100 words, reference something they posted)
 *   5 (Day 21) — Final email (<75 words, "last one from me")
 */

import { supabase, getCompanyName, fmt$, STAGE_LABELS, SERVICE_LABELS } from './supabase'

// ─── System prompt ───────────────────────────────────────────────────────────────
const OZ_SYSTEM = `You are Oz, Outreach agent at GTM360 HQ.
Write outreach that sounds like Sameer — senior GTM operator, peer to peer, never vendor to prospect.
Use the intel provided as source material.
Every message must reference something specific and real.
Never generic. Never spray and pray.
Output ONLY valid JSON, no markdown, no code fences, no explanation.

Generate exactly 5 touches following these rules:

Touch 1 (Day 1): LinkedIn connection request
- channel: "linkedin_connection"
- Hard limit: 300 characters total
- Reference one specific thing from the research
- No pitch. Just a reason to connect.

Touch 2 (Day 3): LinkedIn DM after connection
- channel: "linkedin_dm"
- Under 150 words
- Lead with value or observation, zero ask

Touch 3 (Day 7): Email
- channel: "email"
- Under 100 words
- Line 1: something specific about them
- Line 2: their real problem at this stage
- Line 3: one thing GTM-360 would do about it
- CTA: one ask, low friction (15-min call, reply with interest)
- Must have a subject line

Touch 4 (Day 14): LinkedIn follow-up
- channel: "linkedin_dm"
- Under 100 words
- Reference something they recently posted or shared, or a milestone
- No hard sell

Touch 5 (Day 21): Final email
- channel: "email"
- Under 75 words
- Open with "Last one from me —"
- Direct ask or clean close
- Must have a subject line

JSON schema (output exactly this):
{
  "company_name": "string",
  "contact_name": "string",
  "contact_email": "string or null",
  "contact_linkedin": "string or null",
  "deal_id": "string or null",
  "sequence": [
    {
      "sequence_number": 1,
      "channel": "linkedin_connection | linkedin_dm | email",
      "subject": "string (email only, null for linkedin)",
      "message_body": "string",
      "scheduled_for": "YYYY-MM-DD"
    }
  ]
}`

// ─── CF Workers AI call ──────────────────────────────────────────────────────────
async function callCfAI(messages, signal) {
  const accountId = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID
  const apiToken  = import.meta.env.VITE_CLOUDFLARE_API_TOKEN

  if (!accountId || !apiToken) {
    throw new Error(
      'Add VITE_CLOUDFLARE_ACCOUNT_ID and VITE_CLOUDFLARE_API_TOKEN to .env.local to enable Oz.\n' +
      'Same credentials as CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN in gtm360_agents.py.'
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
    body: JSON.stringify({ messages, max_tokens: 3000 }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.errors?.[0]?.message || `CF AI error ${res.status}`)
  }

  const data = await res.json()
  if (!data.success) throw new Error(data?.errors?.[0]?.message || 'CF AI returned failure')

  return data.result?.response || ''
}

// ─── Prompt builder ──────────────────────────────────────────────────────────────
function buildOzPrompt(deal, intel) {
  const co    = getCompanyName(deal)
  const today = new Date()

  // Scheduled dates: Day 1, 3, 7, 14, 21
  const scheduledDates = [1, 3, 7, 14, 21].map(d => {
    const dt = new Date(today)
    dt.setDate(dt.getDate() + d)
    return dt.toISOString().slice(0, 10)
  })

  let intelCtx = ''
  if (intel) {
    const snap = intel.company_snapshot
    if (snap) {
      if (snap.employees)      intelCtx += `- Employees: ${snap.employees}\n`
      if (snap.revenue)        intelCtx += `- Revenue: ${snap.revenue}\n`
      if (snap.funding)        intelCtx += `- Funding: ${snap.funding}\n`
      if (snap.business_model) intelCtx += `- Model: ${snap.business_model}\n`
      if (snap.icp_fit_score)  intelCtx += `- ICP fit: ${snap.icp_fit_score}/10\n`
    }
    if (intel.financial_pain_hook) {
      intelCtx += `- Financial pain: "${intel.financial_pain_hook}"\n`
    }
    if (intel.access_strategy?.opening_line) {
      intelCtx += `- Opening line that works: "${intel.access_strategy.opening_line}"\n`
    }
    if (intel.access_strategy?.warm_paths?.length) {
      intelCtx += `- Warm paths: ${intel.access_strategy.warm_paths.join('; ')}\n`
    }
    if (intel.buying_committee?.length) {
      const top = intel.buying_committee.find(p => p.priority === 'HIGH') || intel.buying_committee[0]
      if (top) {
        intelCtx += `- Primary buyer: ${top.name || 'unknown'} (${top.role})\n`
        if (top.linkedin) intelCtx += `- Their LinkedIn: ${top.linkedin}\n`
      }
    }
  }

  const service = deal.service_line
    ? `${deal.service_line}${SERVICE_LABELS?.[deal.service_line] ? ` — ${SERVICE_LABELS[deal.service_line]}` : ''}`
    : 'unknown'

  return `Generate a 5-touch outreach sequence for this prospect.

Company: ${co}
Domain: ${deal.company_domain || 'unknown'}
Stage: ${STAGE_LABELS[deal.stage] || deal.stage}
Service interest: ${service}
Deal value: ${fmt$(deal.amount)}
Contact: ${deal.contact_name || 'unknown'}
Contact email: ${deal.contact_email || 'unknown'}
ICP fit: ${deal.icp_fit || 'unknown'}${deal.icp_score ? ` (${deal.icp_score}/10)` : ''}
${intelCtx ? '\nIntel:\n' + intelCtx : ''}
Scheduled dates (use exactly):
- Touch 1: ${scheduledDates[0]}
- Touch 2: ${scheduledDates[1]}
- Touch 3: ${scheduledDates[2]}
- Touch 4: ${scheduledDates[3]}
- Touch 5: ${scheduledDates[4]}

Output ONLY the JSON. No other text.`
}

// ─── Step tracker ────────────────────────────────────────────────────────────────
function makeStep(id, label, status = 'pending') { return { id, label, status } }
function updateStep(setSteps, id, status, label) {
  setSteps(prev => prev.map(s =>
    s.id === id ? { ...s, status, ...(label ? { label } : {}) } : s
  ))
}

// ─── Main: generate sequence ─────────────────────────────────────────────────────
/**
 * generateOutreachSequence(deal, intel, setSteps, signal)
 * Returns array of outreach_queue rows (already saved to Supabase).
 */
export async function generateOutreachSequence(deal, intel, setSteps, signal) {
  const steps = [
    makeStep('context', 'Building outreach context…'),
    makeStep('oz',      'Oz writing sequence…',       'pending'),
    makeStep('parse',   'Parsing 5-touch sequence…',  'pending'),
    makeStep('save',    'Saving to queue…',            'pending'),
  ]
  setSteps(steps)

  // Step 1: Build prompt
  updateStep(setSteps, 'context', 'running')
  const prompt = buildOzPrompt(deal, intel)
  updateStep(setSteps, 'context', 'done')

  // Step 2: CF Workers AI call
  updateStep(setSteps, 'oz', 'running', 'Oz writing sequence…')

  const rawResponse = await callCfAI([
    { role: 'system', content: OZ_SYSTEM },
    { role: 'user',   content: prompt },
  ], signal)

  updateStep(setSteps, 'oz', 'done', 'Sequence drafted')

  // Step 3: Parse
  updateStep(setSteps, 'parse', 'running')

  let parsed
  try {
    const cleaned   = rawResponse
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned)
  } catch {
    throw new Error('Oz returned invalid JSON — retry with more intel context.')
  }

  // Support both `sequence` (new) and `touches` (old Claude schema)
  const touches = parsed.sequence || parsed.touches
  if (!touches?.length) throw new Error('Sequence missing — please retry.')

  updateStep(setSteps, 'parse', 'done', `${touches.length} touches parsed`)

  // Step 4: Save to Supabase
  updateStep(setSteps, 'save', 'running')

  const rows = touches.map(t => ({
    company_name:     parsed.company_name     || getCompanyName(deal),
    contact_name:     parsed.contact_name     || deal.contact_name    || null,
    contact_email:    parsed.contact_email    || deal.contact_email   || null,
    contact_linkedin: parsed.contact_linkedin || null,
    deal_id:          deal.deal_id            || null,
    sequence_number:  t.sequence_number,
    channel:          t.channel,
    subject:          t.subject               || null,
    message_body:     t.message_body,
    scheduled_for:    t.scheduled_for         || null,
    status:           'draft',
    created_by:       'Oz',
  }))

  const { error } = await supabase.from('outreach_queue').insert(rows)
  if (error) throw new Error(`Save failed: ${error.message}`)

  // Audit log
  try {
    await supabase.from('automation_log').insert({
      agent_name:      'Oz',
      automation_name: 'outreach_sequence_generated',
      trigger_type:    'manual',
      status:          'ok',
      output_summary:  `${getCompanyName(deal)} · ${rows.length} touches`,
    })
  } catch { /* non-fatal */ }

  updateStep(setSteps, 'save', 'done', `${rows.length} touches saved`)

  return rows
}

// ─── Queue management ────────────────────────────────────────────────────────────

export async function fetchOutreachQueue() {
  const { data, error } = await supabase
    .from('outreach_queue')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function approveTouch(id) {
  const { error } = await supabase
    .from('outreach_queue')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
  await logOutreachAction('approve', id)
}

export async function skipTouch(id) {
  const { error } = await supabase
    .from('outreach_queue')
    .update({ status: 'skipped' })
    .eq('id', id)

  if (error) throw new Error(error.message)
  await logOutreachAction('skip', id)
}

export async function markSent(id) {
  const { error } = await supabase
    .from('outreach_queue')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['approved'])

  if (error) throw new Error(error.message)
  await logOutreachAction('send', id)
}

export async function updateMessageBody(id, message_body, subject) {
  const patch = { message_body }
  if (subject !== undefined) patch.subject = subject
  const { error } = await supabase.from('outreach_queue').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteCompanyDrafts(companyName) {
  const { error } = await supabase
    .from('outreach_queue')
    .delete()
    .eq('company_name', companyName)
    .eq('status', 'draft')

  if (error) throw new Error(error.message)
}

async function logOutreachAction(action, touchId) {
  try {
    await supabase.from('automation_log').insert({
      agent_name:      'Oz',
      automation_name: `outreach_${action}`,
      trigger_type:    'manual',
      status:          'ok',
      output_summary:  `touch_id: ${touchId}`,
    })
  } catch { /* non-fatal */ }
}

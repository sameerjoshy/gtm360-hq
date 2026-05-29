/**
 * oz.js — Outreach Execution Agent
 *
 * Generates a 5-touch outreach sequence for a pipeline deal using Claude,
 * then writes the touches to the outreach_queue table in Supabase.
 *
 * Architecture:
 *   Deal data (from Rex) → Claude (non-streaming JSON) → Supabase outreach_queue
 *
 * Human gate: nothing ever sends without explicit approve → send clicks in OzView.
 */

import { supabase, getCompanyName, fmt$, STAGE_LABELS, SERVICE_LABELS } from './supabase'

// ─── Constants ─────────────────────────────────────────────────────────────────

const OZ_SYSTEM = `You are Oz, an outreach strategist for GTM360. You design precise, personalised 5-touch outreach sequences for B2B SaaS sales. You write for a fractional CRO firm targeting early-stage B2B founders (Seed–B, 10–150 employees) and scale-up CROs.

Your sequences must:
- Be hyper-specific to the company, not generic templates
- Lead with a business pain, not a feature pitch
- Vary channels: LinkedIn DM, email, LinkedIn comment, repeat if needed
- Escalate warmth and specificity touch by touch
- Include a subject line for every email touch
- Never be longer than 120 words per message
- Use first-person from "Sameer at GTM360" or "GTM-360.com"

Output ONLY valid JSON matching this exact schema — no prose, no markdown fences:

{
  "company_name": "string",
  "contact_name": "string",
  "contact_email": "string or null",
  "contact_linkedin": "string or null",
  "deal_id": "string or null",
  "touches": [
    {
      "sequence_number": 1,
      "channel": "linkedin_dm | email | linkedin_comment | phone | other",
      "subject": "string (email only, null for others)",
      "message_body": "string (max 120 words)",
      "scheduled_for": "YYYY-MM-DD (Day 1, 3, 7, 14, 21 from today)"
    }
  ]
}`

// Build the user prompt for a given deal + optional intel package
function buildOzPrompt(deal, intel) {
  const co     = getCompanyName(deal)
  const today  = new Date().toISOString().slice(0, 10)
  const days   = [1, 3, 7, 14, 21]

  // Calculate scheduled dates
  const dates = days.map(d => {
    const dt = new Date()
    dt.setDate(dt.getDate() + d)
    return dt.toISOString().slice(0, 10)
  })

  let intelContext = ''
  if (intel) {
    const snap = intel.company_snapshot
    if (snap) {
      intelContext += `\nCompany intel (from /intel):\n`
      if (snap.employees)       intelContext += `- Employees: ${snap.employees}\n`
      if (snap.revenue)         intelContext += `- Revenue: ${snap.revenue}\n`
      if (snap.funding)         intelContext += `- Funding: ${snap.funding}\n`
      if (snap.business_model)  intelContext += `- Business model: ${snap.business_model}\n`
      if (snap.icp_fit_score)   intelContext += `- ICP fit: ${snap.icp_fit_score}/10 (${snap.icp_fit_label || ''})\n`
    }
    if (intel.financial_pain_hook) {
      intelContext += `- Financial pain hook: "${intel.financial_pain_hook}"\n`
    }
    if (intel.access_strategy?.opening_line) {
      intelContext += `- Proven opening line: "${intel.access_strategy.opening_line}"\n`
    }
    if (intel.access_strategy?.warm_paths?.length) {
      intelContext += `- Warm paths: ${intel.access_strategy.warm_paths.join('; ')}\n`
    }
    if (intel.buying_committee?.length) {
      const primary = intel.buying_committee.find(p => p.priority === 'HIGH') || intel.buying_committee[0]
      if (primary) {
        intelContext += `- Primary buyer: ${primary.name || 'unknown'} (${primary.role})\n`
        if (primary.linkedin) intelContext += `- LinkedIn: ${primary.linkedin}\n`
      }
    }
  }

  return `Generate a 5-touch outreach sequence for:

Company: ${co}
Domain: ${deal.company_domain || 'unknown'}
Stage: ${STAGE_LABELS[deal.stage] || deal.stage}
Service interest: ${deal.service_line}${SERVICE_LABELS?.[deal.service_line] ? ` (${SERVICE_LABELS[deal.service_line]})` : ''}
Deal value: ${fmt$(deal.amount)}
Contact name: ${deal.contact_name || 'unknown'}
Contact email: ${deal.contact_email || null}
ICP fit: ${deal.icp_fit || 'unknown'}${deal.icp_score ? ` · ${deal.icp_score}/10` : ''}
Today's date: ${today}
${intelContext}
Scheduled touch dates: Day 1 = ${dates[0]}, Day 3 = ${dates[1]}, Day 7 = ${dates[2]}, Day 14 = ${dates[3]}, Day 21 = ${dates[4]}

Return ONLY JSON, no other text.`
}

// ─── Step tracker helper ────────────────────────────────────────────────────────

function makeStep(id, label, status = 'pending') {
  return { id, label, status }
}

function updateStep(setSteps, id, status, label) {
  setSteps(prev => prev.map(s =>
    s.id === id ? { ...s, status, ...(label ? { label } : {}) } : s
  ))
}

// ─── Main: generate sequence ────────────────────────────────────────────────────

/**
 * generateOutreachSequence(deal, intel, setSteps, signal)
 *
 * @param {object}   deal      — pipeline_snapshot row
 * @param {object}   intel     — intel package from generateIntel() (may be null)
 * @param {function} setSteps  — React state setter for step progress UI
 * @param {AbortSignal} signal — AbortController signal for cancellation
 * @returns {object[]}         — array of outreach_queue rows (not yet saved)
 */
export async function generateOutreachSequence(deal, intel, setSteps, signal) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your-anthropic-api-key-here') {
    throw new Error('Add VITE_ANTHROPIC_API_KEY to .env.local to enable Oz.')
  }

  // ── Step 1: Build prompt ──────────────────────────────────────────────────────
  const steps = [
    makeStep('prompt',   'Building outreach context…'),
    makeStep('claude',   'Claude generating sequence…', 'pending'),
    makeStep('parse',    'Parsing 5-touch sequence…',   'pending'),
    makeStep('save',     'Saving to outreach queue…',   'pending'),
  ]
  setSteps(steps)

  updateStep(setSteps, 'prompt', 'running')
  const prompt = buildOzPrompt(deal, intel)
  updateStep(setSteps, 'prompt', 'done')

  // ── Step 2: Call Claude (non-streaming, structured JSON) ─────────────────────
  updateStep(setSteps, 'claude', 'running', 'Claude generating sequence…')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'x-api-key':                               apiKey,
      'anthropic-version':                       '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type':                            'application/json',
    },
    body: JSON.stringify({
      model:      'claude-opus-4-7',
      max_tokens: 4096,
      stream:     false,
      thinking:   { type: 'adaptive' },
      system:     OZ_SYSTEM,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message || `Claude API error ${res.status}`)
  }

  const data = await res.json()
  updateStep(setSteps, 'claude', 'done', 'Claude response received')

  // ── Step 3: Parse JSON ────────────────────────────────────────────────────────
  updateStep(setSteps, 'parse', 'running')

  // Extract text from content blocks (skip thinking blocks)
  const textBlock = data.content?.find(b => b.type === 'text')
  if (!textBlock?.text) throw new Error('Claude returned no text content')

  let parsed
  try {
    // Strip any accidental markdown fences
    const cleaned = textBlock.text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Claude returned invalid JSON — please retry')
  }

  if (!parsed.touches?.length) {
    throw new Error('Sequence missing touches array — please retry')
  }

  updateStep(setSteps, 'parse', 'done', `${parsed.touches.length} touches parsed`)

  // ── Step 4: Build Supabase rows ───────────────────────────────────────────────
  updateStep(setSteps, 'save', 'running', 'Saving to outreach queue…')

  const rows = parsed.touches.map(t => ({
    company_name:     parsed.company_name || getCompanyName(deal),
    contact_name:     parsed.contact_name || deal.contact_name || null,
    contact_email:    parsed.contact_email || deal.contact_email || null,
    contact_linkedin: parsed.contact_linkedin || null,
    deal_id:          deal.deal_id || null,
    sequence_number:  t.sequence_number,
    channel:          t.channel,
    subject:          t.subject || null,
    message_body:     t.message_body,
    scheduled_for:    t.scheduled_for || null,
    status:           'draft',
    created_by:       'Oz',
  }))

  const { error } = await supabase
    .from('outreach_queue')
    .insert(rows)

  if (error) throw new Error(`Supabase save failed: ${error.message}`)

  updateStep(setSteps, 'save', 'done', `${rows.length} touches saved to queue`)

  return rows
}

// ─── Queue management helpers ───────────────────────────────────────────────────

/** Fetch all outreach_queue rows, newest first */
export async function fetchOutreachQueue() {
  const { data, error } = await supabase
    .from('outreach_queue')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

/** Approve a touch: set status = 'approved', record approved_at */
export async function approveTouch(id) {
  const { error } = await supabase
    .from('outreach_queue')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
  await logOutreachAction('approve', id)
}

/** Skip a touch: set status = 'skipped' */
export async function skipTouch(id) {
  const { error } = await supabase
    .from('outreach_queue')
    .update({ status: 'skipped' })
    .eq('id', id)

  if (error) throw new Error(error.message)
  await logOutreachAction('skip', id)
}

/** Mark a touch as sent (only valid if already approved) */
export async function markSent(id) {
  const { error } = await supabase
    .from('outreach_queue')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['approved']) // DB constraint enforced; this is belt-and-suspenders

  if (error) throw new Error(error.message)
  await logOutreachAction('send', id)
}

/** Update message_body (for inline edit) */
export async function updateMessageBody(id, message_body, subject) {
  const patch = { message_body }
  if (subject !== undefined) patch.subject = subject
  const { error } = await supabase
    .from('outreach_queue')
    .update(patch)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

/** Delete all draft touches for a company (regenerate flow) */
export async function deleteCompanyDrafts(companyName) {
  const { error } = await supabase
    .from('outreach_queue')
    .delete()
    .eq('company_name', companyName)
    .eq('status', 'draft')

  if (error) throw new Error(error.message)
}

// ─── Audit log ─────────────────────────────────────────────────────────────────

async function logOutreachAction(action, touchId) {
  try {
    await supabase.from('automation_log').insert({
      agent_name:      'Oz',
      automation_name: `outreach_${action}`,
      trigger_type:    'manual',
      status:          'ok',
      output_summary:  `touch_id: ${touchId}`,
    })
  } catch {
    // Non-fatal — audit log failure shouldn't block the UI action
  }
}

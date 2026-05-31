/**
 * prop.js — Proposal Writer Agent
 *
 * Uses Cloudflare Workers AI (llama-3.3-70b) to draft structured proposals
 * from deal data + discovery notes. Six-section format.
 *
 * Human gate: nothing sends without explicit approval.
 */

import { supabase } from './supabase'

// ─── Pricing engine ─────────────────────────────────────────────────────────────
/**
 * getPricing(serviceLine, dealAmount)
 * Returns { amount, structure, notes } based on service and deal value.
 * Falls back to deal amount from HubSpot if available.
 */
export function getPricing(serviceLine, dealAmount = 0) {
  if (serviceLine === 'DIAG') {
    const amount = dealAmount > 0 ? dealAmount
      : 5000  // default mid-tier
    return {
      amount,
      structure: '50% upfront, 50% on delivery of final report',
      terms: 'Net 14. Work begins on receipt of first payment.',
    }
  }

  if (serviceLine === 'FCRO') {
    const amount = dealAmount > 0 ? dealAmount : 10000
    return {
      amount,
      structure: `$${amount.toLocaleString()}/month retainer. Minimum 3-month engagement.`,
      terms: 'Monthly invoicing, Net 7. First invoice due on engagement start.',
    }
  }

  if (serviceLine === 'ROPS') {
    const amount = dealAmount > 0 ? dealAmount : 8000
    return {
      amount,
      structure: '50% upfront, 50% on delivery',
      terms: 'Net 14. Scope adjustment possible after discovery sprint (week 1).',
    }
  }

  return {
    amount: dealAmount || 5000,
    structure: 'To be discussed',
    terms: 'Net 14.',
  }
}

// ─── System prompt ───────────────────────────────────────────────────────────────
const PROP_SYSTEM = `You are Prop, Proposal Writer at GTM360 HQ.
Write proposals that lead with the client's problem, not our credentials.
Operator voice. No consultant speak. Specific not generic.
Output valid JSON only, no markdown, no code fences, no explanation.

Generate this exact JSON:
{
  "problem_statement": "string — their specific problem, in their language, 2-3 sentences",
  "what_we_heard": "string — 3-4 key themes extracted from the discovery notes, specific not generic",
  "proposed_scope": "string — what we will do, written as concrete activities not vague promises",
  "deliverables": ["string — specific tangible output"],
  "timeline": "string — e.g. '2-week intensive sprint' or '3-month retainer starting Week 1'",
  "investment_amount": number,
  "investment_structure": "string — payment terms",
  "terms": "string — payment and engagement terms",
  "full_proposal_md": "string — complete 6-section proposal in clean markdown"
}

The full_proposal_md MUST have these 6 sections:
# The Situation
# What We Heard
# What We Propose
# How We Work
# The Investment
# Next Steps

Rules:
- Problem statement: use their words, not ours
- What We Heard: pull specific insights from the discovery notes
- Deliverables: 3-6 concrete items, each a real output not a process
- Timeline: realistic for the service (DIAG=2 weeks, FCRO=3+ months, ROPS=4-6 weeks)
- Next Steps: one clear ask only (e.g. 'Reply to confirm' or 'Sign and return by Friday')
- Voice: direct, no filler, reads like a senior operator wrote it`

// ─── CF Workers AI call ──────────────────────────────────────────────────────────
async function callCfAI(messages) {
  const accountId = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID
  const apiToken  = import.meta.env.VITE_CLOUDFLARE_API_TOKEN

  if (!accountId || !apiToken) {
    throw new Error(
      'Add VITE_CLOUDFLARE_ACCOUNT_ID and VITE_CLOUDFLARE_API_TOKEN to .env.local to enable Prop.\n' +
      'Same credentials used in gtm360_agents.py.'
    )
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`

  const res = await fetch(url, {
    method: 'POST',
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

// ─── Main: generate proposal ─────────────────────────────────────────────────────
/**
 * generateProposal({ deal, discoveryNotes }, setStep)
 * Returns parsed proposal JSON (not yet saved).
 */
export async function generateProposal({ deal, discoveryNotes }, setStep) {
  if (!discoveryNotes?.trim()) throw new Error('Discovery notes are required.')
  if (!deal) throw new Error('Select a deal from the pipeline.')

  setStep('Sending context to Prop…')

  const pricing = getPricing(deal.service_line, deal.amount)
  const companyName = deal.company_name || deal.deal_name?.split(/[—–-]/)[0]?.trim() || 'the company'

  const prompt = `
Company: ${companyName}
Service: ${deal.service_line || 'Unknown'}
Deal value: $${(deal.amount || 0).toLocaleString()}
ICP fit: ${deal.icp_fit || 'Unknown'} (score: ${deal.icp_score || '?'}/10)
Contact: ${deal.contact_name || 'Unknown'}

Discovery notes from Sameer:
${discoveryNotes.trim()}

Suggested pricing based on deal:
- Amount: $${pricing.amount.toLocaleString()}
- Structure: ${pricing.structure}
- Terms: ${pricing.terms}

Generate a proposal JSON for this ${deal.service_line || 'engagement'}.
investment_amount should be ${pricing.amount}.`.trim()

  setStep('Prop is writing the proposal…')

  const rawResponse = await callCfAI([
    { role: 'system', content: PROP_SYSTEM },
    { role: 'user',   content: prompt },
  ])

  setStep('Parsing proposal…')

  let parsed
  try {
    const cleaned  = rawResponse
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned)
  } catch {
    throw new Error('Prop returned invalid JSON — please retry with more detail in discovery notes.')
  }

  // Ensure pricing is applied
  if (!parsed.investment_amount || parsed.investment_amount === 0) {
    parsed.investment_amount = pricing.amount
  }
  if (!parsed.investment_structure) parsed.investment_structure = pricing.structure
  if (!parsed.terms)               parsed.terms               = pricing.terms

  return parsed
}

// ─── Persistence ─────────────────────────────────────────────────────────────────
export async function saveProposal(deal, proposal) {
  const companyName = deal.company_name || deal.deal_name?.split(/[—–-]/)[0]?.trim() || 'Unknown'

  // Check for existing versions
  const { data: existing } = await supabase
    .from('proposals')
    .select('version')
    .eq('deal_id', deal.deal_id || '')
    .order('version', { ascending: false })
    .limit(1)

  const version = existing?.[0]?.version ? existing[0].version + 1 : 1

  const row = {
    company_name:         companyName,
    deal_id:              deal.deal_id || null,
    service_line:         deal.service_line || null,
    version,
    status:               'draft',
    problem_statement:    proposal.problem_statement    || null,
    what_we_heard:        proposal.what_we_heard        || null,
    proposed_scope:       proposal.proposed_scope       || null,
    deliverables:         proposal.deliverables         || [],
    timeline:             proposal.timeline             || null,
    investment_amount:    proposal.investment_amount    || 0,
    investment_structure: proposal.investment_structure || null,
    terms:                proposal.terms               || null,
    full_proposal_md:     proposal.full_proposal_md    || null,
  }

  const { data, error } = await supabase
    .from('proposals')
    .insert(row)
    .select('id')
    .single()

  if (error) throw new Error(`Save failed: ${error.message}`)

  // Audit
  try {
    await supabase.from('automation_log').insert({
      agent_name:      'Prop',
      automation_name: 'proposal_generated',
      trigger_type:    'manual',
      status:          'ok',
      output_summary:  `${companyName} · ${deal.service_line} · v${version} · $${proposal.investment_amount?.toLocaleString()}`,
    })
  } catch { /* non-fatal */ }

  return data.id
}

export async function approveProposal(id) {
  const { error } = await supabase
    .from('proposals')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function markProposalSent(id) {
  const { error } = await supabase
    .from('proposals')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function updateProposalSection(id, fields) {
  const { error } = await supabase
    .from('proposals')
    .update(fields)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function fetchProposals() {
  const { data, error } = await supabase
    .from('proposals')
    .select(`
      id, company_name, deal_id, service_line, version, status,
      problem_statement, what_we_heard, proposed_scope,
      deliverables, timeline, investment_amount, investment_structure,
      terms, full_proposal_md, notion_page_url,
      approved_at, sent_at, created_at
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function fetchProposalsByDeal(dealId) {
  const { data, error } = await supabase
    .from('proposals')
    .select('id, version, status, investment_amount, created_at')
    .eq('deal_id', dealId)
    .order('version', { ascending: false })

  if (error) return []
  return data || []
}

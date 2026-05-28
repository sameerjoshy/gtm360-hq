/**
 * GTM360 /intel — Account Intelligence Package
 *
 * Pipeline:
 *   Layer 1 (Company data)  — Claude + web_search_20250305 (replaces Clay MCP; not browser-accessible)
 *   Layer 2 (People)        — Apollo API direct call
 *   Layer 3 (Web signals)   — Claude web_search (same call as Layer 1)
 *   Layer 4 (Synthesis)     — Claude produces structured JSON
 *
 * All layers run in a single orchestrated flow with per-step progress callbacks.
 */

import { getCompanyName, fmt$, supabase } from './supabase'
import { apolloSearchPeople } from './apollo'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

// ─── Prompt builders ──────────────────────────────────────────────────────────

const INTEL_SYSTEM = `You are Rex, CRO at GTM360 HQ. You produce account intelligence packages for B2B revenue consultancy GTM-360.

Rules:
- Be precise. Never fabricate. Use "[NO DATA]" if information not found.
- Operator voice: direct, no consultant fluff, short sentences that carry weight.
- Output ONLY valid JSON — no markdown fences, no explanation before or after.

GTM-360 services: GTM Diagnostic ($3–8K), Fractional CRO ($5–20K/mo), RevOps Audit ($4–15K)
ICP: B2B SaaS/Services, $1M–$100M ARR, founders and CROs, 10–150 employees`

function buildIntelPrompt(deal, people) {
  const co     = getCompanyName(deal)
  const domain = deal.company_domain || ''

  const peopleStr = people.length > 0
    ? people.map(p =>
        `- ${p.name}  |  ${p.title}${p.linkedin_url ? `  |  ${p.linkedin_url}` : ''}`
      ).join('\n')
    : '(Apollo search unavailable — infer from web research)'

  return `Account Intelligence Request
Company : ${co}
Domain  : ${domain}
In pipeline : ${deal.service_line} · ${fmt$(deal.amount)} · ICP ${deal.icp_fit || 'unknown'}
Contact on record : ${deal.contact_name || 'unknown'}

People found via Apollo:
${peopleStr}

INSTRUCTIONS
Use web search to find:
1. Company headcount, ARR/revenue estimate, funding stage + amount + investors
2. Tech stack (CRM, marketing automation, sales tools)
3. Recent news from the last 90 days (funding, hiring, product launches, exec moves)
4. Financial signals (growth indicators, cost pressure, expansion signals)

Then synthesise everything into the Account Intelligence Package JSON:
{
  "company_snapshot": {
    "employees": "string — headcount or range",
    "revenue": "string — ARR/revenue estimate or [NO DATA]",
    "funding": "string — stage · amount · investors or [NO DATA]",
    "tech_stack": ["key tools — CRM, marketing, sales"],
    "business_model": "B2B SaaS | B2B Services | Marketplace | Other",
    "icp_fit_score": number_1_to_10,
    "icp_fit_label": "Strong | Moderate | Weak"
  },
  "financial_pain_hook": "3–4 sentences. Format: '[Company] is at [stage/revenue] with [X] people. [Specific financial pressure based on their situation]. [What this means for their GTM motion]. [The quantified opportunity GTM-360 can unlock].' Source every claim. No hedging.",
  "buying_committee": [
    {
      "role": "Economic Buyer | Champion | Gatekeeper | Influencer",
      "name": "real name from Apollo or web research",
      "title": "exact title",
      "priority": "HIGH | MEDIUM | LOW",
      "why": "one sentence on their likely priority or pain",
      "linkedin": "URL or null"
    }
  ],
  "access_strategy": {
    "warm_paths": ["events they attend/speak at", "mutual connections", "content they engage with", "active communities"],
    "sequence": [
      { "day": 1,  "channel": "LinkedIn | Email | Phone", "hook": "specific angle" },
      { "day": 3,  "channel": "LinkedIn | Email | Phone", "hook": "follow-up angle" },
      { "day": 7,  "channel": "LinkedIn | Email | Phone", "hook": "value add" },
      { "day": 14, "channel": "LinkedIn | Email | Phone", "hook": "final attempt" }
    ],
    "opening_line": "verbatim personalized opener — specific to their actual situation, not generic"
  },
  "competitive_context": {
    "competitors": ["companies they compete with"],
    "gtm360_positioning": "how GTM-360 fits vs alternatives they might consider",
    "likely_objections": [
      { "objection": "string", "response": "direct, specific counter" }
    ]
  },
  "confidence": "HIGH | MEDIUM | LOW",
  "data_sources": ["Web", "Apollo", "Claude"]
}`
}

// ─── Step helpers ─────────────────────────────────────────────────────────────

function makeStepManager(onStep) {
  const steps = []
  let id = 0

  const add = (label, status = 'running') => {
    const step = { id: id++, label, status }
    steps.push(step)
    onStep([...steps])
    return step
  }

  const update = (step, status, label) => {
    step.status = status
    if (label !== undefined) step.label = label
    onStep([...steps])
  }

  return { add, update }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate an Account Intelligence Package for a deal.
 *
 * @param {Object}   deal     — pipeline_snapshot row
 * @param {Function} onStep   — called with updated steps array on every state change
 * @param {AbortSignal} signal — optional AbortController signal for cancellation
 * @returns {Object} intel package (JSON from Claude)
 */
export async function generateIntel(deal, onStep, signal) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY not configured')

  const { add, update } = makeStepManager(onStep)

  // ── Layer 2: Apollo people search ─────────────────────────────────────────
  const apolloStep = add('Finding stakeholders via Apollo…')
  let people = []
  try {
    people = await apolloSearchPeople(deal.company_domain || '', signal)
    update(apolloStep, 'done',
      `Found ${people.length} stakeholder${people.length !== 1 ? 's' : ''} via Apollo`)
  } catch (e) {
    if (e.name === 'AbortError') throw e
    update(apolloStep, 'warn', `Apollo unavailable — ${e.message}`)
  }

  // ── Layers 1 + 3 + 4: Claude web research + synthesis ────────────────────
  const webStep   = add('Researching company signals…')
  const synthStep = add('Building intelligence package…', 'pending')

  let res
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      signal,
      headers: {
        'x-api-key':                                apiKey,
        'anthropic-version':                        '2023-06-01',
        'anthropic-beta':                           'web-search-2025-03-05',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type':                             'application/json',
      },
      body: JSON.stringify({
        model:    'claude-opus-4-7',
        max_tokens: 4096,
        thinking: { type: 'adaptive' },
        system:   INTEL_SYSTEM,
        tools:    [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
        messages: [{ role: 'user', content: buildIntelPrompt(deal, people) }],
      }),
    })
  } catch (e) {
    update(webStep, 'error')
    update(synthStep, 'error')
    throw e
  }

  update(webStep, 'done', 'Company signals researched')
  update(synthStep, 'running')

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    update(synthStep, 'error')
    throw new Error(body?.error?.message || `Claude API returned ${res.status}`)
  }

  const data = await res.json()

  // Find last text block — that's the final synthesis (web_search tool results come first)
  const textBlock = [...(data.content || [])].reverse().find(b => b.type === 'text')
  if (!textBlock?.text) {
    update(synthStep, 'error')
    throw new Error('No text in Claude response')
  }

  // Strip markdown fences if Claude wrapped the JSON anyway
  const raw = textBlock.text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    update(synthStep, 'error')
    throw new Error('Response is not parseable JSON')
  }

  let intel
  try {
    intel = JSON.parse(jsonMatch[0])
  } catch {
    update(synthStep, 'error')
    throw new Error('JSON parse failed')
  }

  update(synthStep, 'done', 'Intelligence package ready')
  add(`Complete · ${intel.confidence || 'MEDIUM'} confidence`, 'done')

  return intel
}

// ─── Supabase persistence ─────────────────────────────────────────────────────

/**
 * Upsert intel package to research_briefs (keyed on company_domain).
 * Returns the saved row.
 */
export async function saveIntelToSupabase(deal, intel) {
  const co = getCompanyName(deal)

  const { data, error } = await supabase
    .from('research_briefs')
    .upsert(
      {
        company_name:        co,
        company_domain:      deal.company_domain || '',
        icp_fit:             intel.company_snapshot?.icp_fit_label || deal.icp_fit,
        icp_score:           intel.company_snapshot?.icp_fit_score  || deal.icp_score || null,
        recommended_entry:   deal.service_line,
        status:              'intel_complete',
        company_snapshot:    intel.company_snapshot    || null,
        financial_pain_hook: intel.financial_pain_hook || null,
        buying_committee:    intel.buying_committee    || null,
        access_strategy:     intel.access_strategy     || null,
        competitive_context: intel.competitive_context || null,
        intel_generated_at:  new Date().toISOString(),
        intel_confidence:    intel.confidence          || null,
        data_sources:        intel.data_sources        || null,
      },
      { onConflict: 'company_domain' }
    )
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

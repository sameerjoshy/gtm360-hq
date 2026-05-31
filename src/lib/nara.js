/**
 * nara.js — Nurture Monitor Agent helpers
 *
 * Reads engagement signals from:
 *   - outreach_queue (signal_triggered=true records)
 *   - escalations (raised_by='Nara' records)
 *
 * Drafts contextual follow-up responses via Cloudflare Workers AI.
 */

import { supabase } from './supabase'

// ─── Fetch signals ────────────────────────────────────────────────────────────

/** Signal-triggered outreach touches — what Nara detected */
export async function fetchNaraSignals() {
  const { data, error } = await supabase
    .from('outreach_queue')
    .select('*')
    .eq('signal_triggered', true)
    .order('signal_detected_at', { ascending: false, nullsFirst: false })

  if (error) throw new Error(error.message)
  return data || []
}

/** Nara escalations — flagged items for Sameer's attention */
export async function fetchNaraEscalations() {
  const { data, error } = await supabase
    .from('escalations')
    .select('*')
    .eq('raised_by', 'Nara')
    .order('raised_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

/** Count today's new Nara signals (for CommandCenter badge) */
export async function countTodayNaraSignals() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { count: sigCount } = await supabase
    .from('outreach_queue')
    .select('id', { count: 'exact', head: true })
    .eq('signal_triggered', true)
    .gte('signal_detected_at', todayStart.toISOString())

  const { count: escCount } = await supabase
    .from('escalations')
    .select('id', { count: 'exact', head: true })
    .eq('raised_by', 'Nara')
    .eq('status', 'open')
    .gte('raised_at', todayStart.toISOString())

  return (sigCount || 0) + (escCount || 0)
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/** Dismiss signal — mark outreach touch as skipped */
export async function dismissSignal(id) {
  const { error } = await supabase
    .from('outreach_queue')
    .update({ status: 'skipped', signal_triggered: false })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

/** Mark escalation resolved */
export async function resolveEscalation(id) {
  const { error } = await supabase
    .from('escalations')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

// ─── CF Workers AI — draft follow-up ─────────────────────────────────────────

const NARA_SYSTEM = `Draft a brief follow-up response (under 100 words).
Peer to peer tone. Reference the specific signal.
Sound like Sameer — senior GTM operator, warm but direct.
Output just the message text, no subject line, no preamble.`

export async function draftNaraResponse(signal, signal_type) {
  const accountId = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID
  const apiToken  = import.meta.env.VITE_CLOUDFLARE_API_TOKEN

  if (!accountId || !apiToken) {
    throw new Error(
      'Add VITE_CLOUDFLARE_ACCOUNT_ID and VITE_CLOUDFLARE_API_TOKEN to .env.local to enable Nara AI drafts.\n' +
      'Same credentials as CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN in gtm360_agents.py.'
    )
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`

  const sigTypeLabel = signal_type === 'EMAIL_REPLY' ? 'email reply'
    : signal_type === 'MEETING_BOOKED' ? 'meeting booking'
    : signal_type || 'engagement signal'

  const prompt = `Company: ${signal.company_name}
Contact: ${signal.contact_name || signal.contact_email || 'unknown'}
Signal type: ${sigTypeLabel}
Signal details: ${signal.response_notes || signal.signal_type_nara || 'No additional context'}
Original message sent (Touch ${signal.sequence_number}): ${signal.message_body?.slice(0, 200)}

Draft a follow-up response to this ${sigTypeLabel}.`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: NARA_SYSTEM },
        { role: 'user',   content: prompt },
      ],
      max_tokens: 300,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.errors?.[0]?.message || `CF AI error ${res.status}`)
  }

  const data = await res.json()
  if (!data.success) throw new Error(data?.errors?.[0]?.message || 'CF AI failed')

  return data.result?.response?.trim() || ''
}

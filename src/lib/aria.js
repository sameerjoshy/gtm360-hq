/**
 * aria.js — Trend Researcher Agent helpers
 *
 * Reads from trend_reports (written by Python automation every Monday 7 AM).
 * Sends observations to content_queue (Andy's inbox) as raw items.
 */

import { supabase } from './supabase'

// ─── Fetch trend reports ──────────────────────────────────────────────────────

/** Fetch all weekly reports, newest first */
export async function fetchTrendReports() {
  const { data, error } = await supabase
    .from('trend_reports')
    .select('id, week_of, emerging, crowded, gaps, raw_observations, generated_at, status')
    .order('week_of', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

/** Fetch a specific week's report */
export async function fetchReportForWeek(weekOf) {
  const { data, error } = await supabase
    .from('trend_reports')
    .select('*')
    .eq('week_of', weekOf)
    .single()

  if (error) return null
  return data
}

// ─── Parse JSONB arrays (handle both string[] and object[] from Python) ───────

/**
 * normaliseItems(jsonbValue)
 * Python may write strings or objects. Normalise both into:
 * { title, description, source, hook }
 */
export function normaliseItems(raw) {
  if (!raw) return []
  const arr = Array.isArray(raw) ? raw : []
  return arr.map((item, i) => {
    if (typeof item === 'string') {
      return { id: i, title: item, description: '', source: '', hook: '' }
    }
    return {
      id:          i,
      title:       item.topic || item.title || item.name || `Item ${i + 1}`,
      description: item.signal || item.description || item.reason || item.opportunity || '',
      source:      item.source || '',
      hook:        item.hook || item.hook_angle || item.angle || '',
    }
  })
}

// ─── Send to Andy ─────────────────────────────────────────────────────────────

/**
 * sendToAndy(text, source)
 * Creates a raw observation in content_queue for Andy to draft from.
 * Returns the created row id.
 */
export async function sendToAndy(text, source = 'Aria') {
  const { data, error } = await supabase
    .from('content_queue')
    .insert({
      raw_observation:   text,
      observation_source: source,
      observation_date:  new Date().toISOString().slice(0, 10),
      status:            'raw',
      channel:           'LinkedIn',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Send to Andy failed: ${error.message}`)

  // Audit
  try {
    await supabase.from('automation_log').insert({
      agent_name:      'Aria',
      automation_name: 'observation_sent_to_andy',
      trigger_type:    'manual',
      status:          'ok',
      output_summary:  text.slice(0, 80),
    })
  } catch { /* non-fatal */ }

  return data.id
}

/** Send all raw_observations from a report to Andy in bulk */
export async function sendAllToAndy(observations) {
  const items = normaliseItems(observations)
  if (!items.length) throw new Error('No observations to send.')

  const rows = items.map(item => ({
    raw_observation:    item.title + (item.description ? ` — ${item.description}` : ''),
    observation_source: 'Aria',
    observation_date:   new Date().toISOString().slice(0, 10),
    status:             'raw',
    channel:            'LinkedIn',
  }))

  const { error } = await supabase.from('content_queue').insert(rows)
  if (error) throw new Error(error.message)

  return rows.length
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function nextMonday() {
  const d = new Date()
  const daysUntil = (1 - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + daysUntil)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

/** Get Monday of the week containing `date` */
export function weekMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

/** Add/subtract weeks from a YYYY-MM-DD string */
export function shiftWeek(weekOf, delta) {
  const d = new Date(weekOf + 'T12:00:00')
  d.setDate(d.getDate() + delta * 7)
  return weekMonday(d)
}

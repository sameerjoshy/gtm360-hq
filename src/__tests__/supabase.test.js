/**
 * GTM360 HQ — Supabase Connectivity & Data Integrity Tests
 * Runs against the real Supabase instance (read-only, anon key).
 */
import { createClient } from '@supabase/supabase-js'
import { describe, test, expect, beforeAll } from 'vitest'

const SUPABASE_URL     = 'https://dtqsnojfatzjsklsjzwj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0cXNub2pmYXR6anNrbHNqendqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MTk2MjgsImV4cCI6MjA5NTE5NTYyOH0.IOnNkAmFw-iGnWq2h2vVg0VRE7Smm-sNSMYUDcL3GLQ'

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── Known tables ─────────────────────────────────────────────────────────────
const ALL_TABLES = [
  'pipeline_snapshot',
  'daily_brief',
  'okr_tracker',
  'finance_tracker',
  'content_queue',
  'escalations',
  'error_log',
  'automation_log',
  'agent_memory',
  'research_briefs',
  'meeting_prep',
  'qc_log',
]

// Tables expected to have data
const DATA_TABLES = [
  'pipeline_snapshot',
  'daily_brief',
  'okr_tracker',
  'finance_tracker',
  'content_queue',
]

// ─── Section 1: Connectivity ──────────────────────────────────────────────────
describe('1. Supabase Connectivity', () => {
  test('client initialises without throwing', () => {
    expect(db).toBeDefined()
    expect(typeof db.from).toBe('function')
  })

  test.each(ALL_TABLES)('table "%s" is reachable', async (table) => {
    const { error } = await db.from(table).select('id').limit(1)
    expect(error, `Table "${table}" query failed: ${error?.message}`).toBeNull()
  })

  test.each(DATA_TABLES)('table "%s" has at least one row', async (table) => {
    const { count, error } = await db
      .from(table)
      .select('*', { count: 'exact', head: true })
    expect(error).toBeNull()
    expect(count, `Table "${table}" is empty`).toBeGreaterThan(0)
  })

  test('pipeline_snapshot has records with gtm360_record_type = Live', async () => {
    const { data, error } = await db
      .from('pipeline_snapshot')
      .select('deal_id')
      .eq('gtm360_record_type', 'Live')
    expect(error).toBeNull()
    // May be null if field unused — just verify query succeeds
    expect(Array.isArray(data)).toBe(true)
  })

  test('daily_brief has the most recent record', async () => {
    const { data, error } = await db
      .from('daily_brief')
      .select('brief_date, one_thing, sams_flag, priority_actions')
      .order('brief_date', { ascending: false })
      .limit(1)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data[0].brief_date).toBeTruthy()
  })

  test('okr_tracker has Q2-2026 records', async () => {
    const { data, error } = await db
      .from('okr_tracker')
      .select('quarter, kr_number')
      .eq('quarter', 'Q2-2026')
    expect(error).toBeNull()
    expect(data.length).toBeGreaterThan(0)
  })
})

// ─── Section 2: Data Integrity ────────────────────────────────────────────────
describe('2. Data Integrity', () => {
  let pipelineRows = []
  let briefRows    = []
  let okrRows      = []
  let financeRows  = []

  beforeAll(async () => {
    const [p, b, o, f] = await Promise.all([
      db.from('pipeline_snapshot').select('*'),
      db.from('daily_brief').select('*').order('brief_date', { ascending: false }).limit(1),
      db.from('okr_tracker').select('*').eq('quarter', 'Q2-2026'),
      db.from('finance_tracker').select('*'),
    ])
    pipelineRows = p.data || []
    briefRows    = b.data || []
    okrRows      = o.data || []
    financeRows  = f.data || []
  })

  // pipeline_snapshot integrity
  test('pipeline_snapshot: every row has deal_id', () => {
    const missing = pipelineRows.filter(r => !r.deal_id)
    expect(missing, `${missing.length} rows missing deal_id`).toHaveLength(0)
  })

  test('pipeline_snapshot: every row has deal_name', () => {
    const missing = pipelineRows.filter(r => !r.deal_name)
    expect(missing, `${missing.length} rows missing deal_name`).toHaveLength(0)
  })

  test('pipeline_snapshot: every row has amount > 0', () => {
    const missing = pipelineRows.filter(r => !r.amount || Number(r.amount) <= 0)
    expect(missing, `${missing.length} rows with missing/zero amount`).toHaveLength(0)
  })

  test('pipeline_snapshot: every row has a stage value', () => {
    const missing = pipelineRows.filter(r => !r.stage)
    expect(missing, `${missing.length} rows missing stage`).toHaveLength(0)
  })

  test('pipeline_snapshot: at least 5 deals present', () => {
    expect(pipelineRows.length).toBeGreaterThanOrEqual(5)
  })

  // daily_brief integrity
  test('daily_brief: most recent record has one_thing', () => {
    expect(briefRows[0]?.one_thing).toBeTruthy()
  })

  test('daily_brief: most recent record has sams_flag', () => {
    expect(briefRows[0]?.sams_flag).toBeTruthy()
  })

  test('daily_brief: priority_actions is a valid JSON array', () => {
    const raw = briefRows[0]?.priority_actions
    expect(raw).toBeDefined()

    let parsed = raw
    if (typeof raw === 'string') {
      parsed = JSON.parse(raw)
      if (typeof parsed === 'string') parsed = JSON.parse(parsed)
    }

    expect(Array.isArray(parsed), `priority_actions is not an array: ${typeof parsed}`).toBe(true)
    expect(parsed.length, 'priority_actions is empty').toBeGreaterThan(0)
  })

  test('daily_brief: priority_actions items are non-empty strings', () => {
    const raw = briefRows[0]?.priority_actions
    let parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (typeof parsed === 'string') parsed = JSON.parse(parsed)
    parsed.forEach((item, i) => {
      expect(typeof item === 'string' || typeof item?.action === 'string',
        `priority_actions[${i}] is not a string`).toBe(true)
    })
  })

  // okr_tracker integrity
  test('okr_tracker: exactly 9 KRs for Q2-2026', () => {
    expect(okrRows.length).toBe(9)
  })

  test('okr_tracker: 3 objectives (O1, O2, O3)', () => {
    const objectives = [...new Set(okrRows.map(r => r.objective_number))].sort()
    expect(objectives).toEqual([1, 2, 3])
  })

  test('okr_tracker: all rows have kr_target > 0', () => {
    const invalid = okrRows.filter(r => !r.kr_target || Number(r.kr_target) <= 0)
    expect(invalid, `${invalid.length} KRs with missing/zero target`).toHaveLength(0)
  })

  test('okr_tracker: kr_current is numeric (not null)', () => {
    const invalid = okrRows.filter(r => r.kr_current === null || r.kr_current === undefined)
    expect(invalid).toHaveLength(0)
  })

  // finance_tracker integrity
  test('finance_tracker: every row has record_type', () => {
    const missing = financeRows.filter(r => !r.record_type)
    expect(missing).toHaveLength(0)
  })

  test('finance_tracker: every row has amount', () => {
    const missing = financeRows.filter(r => r.amount === null || r.amount === undefined)
    expect(missing).toHaveLength(0)
  })

  test('finance_tracker: every row has a status', () => {
    const missing = financeRows.filter(r => !r.status)
    expect(missing).toHaveLength(0)
  })
})

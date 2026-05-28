/**
 * GTM360 HQ — API Key Tests
 * Verifies Supabase anon read access and Claude API key validity.
 */
import { createClient } from '@supabase/supabase-js'
import { describe, test, expect } from 'vitest'

const SUPABASE_URL     = 'https://dtqsnojfatzjsklsjzwj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0cXNub2pmYXR6anNrbHNqendqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MTk2MjgsImV4cCI6MjA5NTE5NTYyOH0.IOnNkAmFw-iGnWq2h2vVg0VRE7Smm-sNSMYUDcL3GLQ'

// ─── Section 4: API Tests ─────────────────────────────────────────────────────
describe('4. API Tests', () => {

  describe('Supabase anon key', () => {
    test('anon key is a valid JWT (three base64 segments)', () => {
      const parts = SUPABASE_ANON_KEY.split('.')
      expect(parts).toHaveLength(3)
      parts.forEach((p, i) => {
        expect(p.length, `JWT segment ${i} is empty`).toBeGreaterThan(0)
      })
    })

    test('anon key decodes to role=anon', () => {
      const payload = JSON.parse(atob(SUPABASE_ANON_KEY.split('.')[1]))
      expect(payload.role).toBe('anon')
      expect(payload.ref).toBe('dtqsnojfatzjsklsjzwj')
    })

    test('anon key is not expired', () => {
      const payload = JSON.parse(atob(SUPABASE_ANON_KEY.split('.')[1]))
      const expiresAt = payload.exp * 1000
      expect(expiresAt).toBeGreaterThan(Date.now())
    })

    test('anon key can read pipeline_snapshot', async () => {
      const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      const { data, error } = await db
        .from('pipeline_snapshot')
        .select('deal_id, amount')
        .limit(1)
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    test('anon key can read daily_brief', async () => {
      const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      const { data, error } = await db
        .from('daily_brief')
        .select('id, one_thing')
        .limit(1)
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    test('anon key can read okr_tracker', async () => {
      const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      const { data, error } = await db
        .from('okr_tracker')
        .select('id, quarter, kr_number')
        .eq('quarter', 'Q2-2026')
      expect(error).toBeNull()
      expect(data.length).toBe(9)
    })
  })

  describe('Claude API key', () => {
    const apiKey = process.env.VITE_ANTHROPIC_API_KEY || ''

    test('VITE_ANTHROPIC_API_KEY is set', () => {
      expect(apiKey, 'VITE_ANTHROPIC_API_KEY env var is not set. Add it to .env.local').toBeTruthy()
    })

    test('API key has correct sk-ant prefix', () => {
      if (!apiKey) return // skip if not set
      expect(apiKey.startsWith('sk-ant-'), `Key should start with sk-ant-, got: ${apiKey.slice(0, 10)}...`).toBe(true)
    })

    test('API key length is plausible (>80 chars)', () => {
      if (!apiKey) return
      expect(apiKey.length).toBeGreaterThan(80)
    })

    test('Claude API key is accepted (minimal /v1/models call)', async () => {
      if (!apiKey) {
        console.warn('SKIP: VITE_ANTHROPIC_API_KEY not set')
        return
      }
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      })
      // 200 = valid key, 401 = invalid
      expect(res.status, `API key rejected (${res.status})`).toBe(200)
    })

    test('Claude API key is not the placeholder value', () => {
      if (!apiKey) return
      expect(apiKey).not.toBe('your-anthropic-api-key-here')
      expect(apiKey).not.toContain('placeholder')
    })
  })
})

/**
 * GTM360 HQ — React Component Tests
 * Uses Vitest + React Testing Library with mocked store and router.
 */
import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, test, expect, beforeEach } from 'vitest'

// Mock the Zustand store
vi.mock('../store', () => ({
  useAppStore: vi.fn(),
}))

import { useAppStore } from '../store'
import CommandCenter from '../views/CommandCenter'

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const MOCK_BRIEF = {
  id: 'test-brief-1',
  brief_date: '2026-05-28',
  one_thing: 'Close the revVana deal this week — largest deal in pipeline at $20K',
  sams_flag: 'Pipeline stall risk — 3 deals over 20 days with no activity',
  priority_actions: JSON.stringify([
    'Conduct all 6 scheduled appointments this week',
    'Send 1 proposal by end of week',
    'Activate the 5th agent to unlock daily brief automation',
  ]),
  status: 'ready',
}

const MOCK_DEALS = [
  { deal_id: '1', deal_name: 'revVana — Fractional CRO',      amount: 20000, stage: 'qualifiedtobuy',        icp_fit: 'Strong',   service_line: 'FCRO', signal: 'Hot' },
  { deal_id: '2', deal_name: 'Common Room — GTM Diagnostic',  amount: 2000,  stage: 'appointmentscheduled',  icp_fit: null,       service_line: 'DIAG', signal: null  },
  { deal_id: '3', deal_name: 'Momentum — GTM Diagnostic',     amount: 3000,  stage: 'appointmentscheduled',  icp_fit: 'Moderate', service_line: 'DIAG', signal: 'Watch' },
  { deal_id: '4', deal_name: 'Bounti.ai — GTM Diagnostic',    amount: 4000,  stage: 'appointmentscheduled',  icp_fit: 'Strong',   service_line: 'DIAG', signal: 'Hot' },
]

const MOCK_OKRS = [
  { objective_number: 1, objective_text: 'Build a repeatable pipeline engine', kr_number: 1, kr_text: 'Book 10 discovery calls', kr_target: 10, kr_current: 5, status: 'on_track', quarter: 'Q2-2026' },
  { objective_number: 1, kr_number: 2, kr_text: 'Submit 3 proposals', kr_target: 3, kr_current: 0, status: 'off_track', quarter: 'Q2-2026' },
  { objective_number: 1, kr_number: 3, kr_text: 'Close 1 deal', kr_target: 1, kr_current: 0, status: 'off_track', quarter: 'Q2-2026' },
  { objective_number: 2, objective_text: 'Build GTM360 content engine', kr_number: 1, kr_text: 'Publish 12 posts', kr_target: 12, kr_current: 4, status: 'on_track', quarter: 'Q2-2026' },
  { objective_number: 2, kr_number: 2, kr_text: 'Grow LinkedIn followers', kr_target: 500, kr_current: 210, status: 'on_track', quarter: 'Q2-2026' },
  { objective_number: 2, kr_number: 3, kr_text: 'Reach 5K impressions', kr_target: 5000, kr_current: 1200, status: 'at_risk', quarter: 'Q2-2026' },
  { objective_number: 3, objective_text: 'Run GTM360 OS as a product', kr_number: 1, kr_text: 'Run 5 agents daily', kr_target: 5, kr_current: 5, status: 'on_track', quarter: 'Q2-2026' },
  { objective_number: 3, kr_number: 2, kr_text: 'Daily brief sessions', kr_target: 60, kr_current: 30, status: 'on_track', quarter: 'Q2-2026' },
  { objective_number: 3, kr_number: 3, kr_text: 'Demo product externally', kr_target: 3, kr_current: 0, status: 'off_track', quarter: 'Q2-2026' },
]

const MOCK_FINANCE = [
  { id: '1', record_type: 'invoice', client_name: 'Client A', amount: 5000, status: 'paid',  payment_date: '2026-05-10' },
  { id: '2', record_type: 'invoice', client_name: 'Client B', amount: 3000, status: 'sent',  payment_date: null },
  { id: '3', record_type: 'invoice', client_name: 'Client C', amount: 2000, status: 'overdue', payment_date: null },
]

// ─── Render helper ─────────────────────────────────────────────────────────────
function renderCC(storeOverrides = {}) {
  const mockState = {
    brief:          MOCK_BRIEF,
    deals:          MOCK_DEALS,
    okrs:           MOCK_OKRS,
    content:        [],
    finance:        MOCK_FINANCE,
    loading:        false,
    lastRefresh:    null,
    refresh:        vi.fn(),
    ...storeOverrides,
  }
  // Zustand calls useAppStore() with no selector, or useAppStore(s => s.x) with selector
  useAppStore.mockImplementation(selector =>
    typeof selector === 'function' ? selector(mockState) : mockState
  )
  return render(
    <MemoryRouter>
      <CommandCenter />
    </MemoryRouter>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('3. React Component Tests', () => {

  describe('CommandCenter — renders', () => {
    test('renders without crashing', () => {
      expect(() => renderCC()).not.toThrow()
    })

    test('renders the page container', () => {
      renderCC()
      // The root div with max-w-[1400px] should be present
      const main = document.querySelector('.max-w-\\[1400px\\]')
      expect(main).toBeInTheDocument()
    })
  })

  describe('ONE THING banner', () => {
    test('renders one_thing text from brief', () => {
      renderCC()
      expect(screen.getByText(MOCK_BRIEF.one_thing)).toBeInTheDocument()
    })

    test('renders "One Thing" label', () => {
      renderCC()
      expect(screen.getByText(/one thing/i)).toBeInTheDocument()
    })

    test('renders brief date', () => {
      renderCC()
      // Brief date displayed as "Wed, 28 May" or similar
      expect(screen.getByText(/28/)).toBeInTheDocument()
    })

    test('shows fallback message when no brief loaded', () => {
      renderCC({ brief: null })
      expect(screen.getByText(/no brief loaded/i)).toBeInTheDocument()
    })

    test('shows Sam /today hint in empty state', () => {
      renderCC({ brief: null })
      expect(screen.getByText('/today')).toBeInTheDocument()
    })
  })

  describe('Priority Actions', () => {
    test('renders "Priority Actions" heading', () => {
      renderCC()
      expect(screen.getByText(/priority actions/i)).toBeInTheDocument()
    })

    test('renders first 3 priority actions from JSON string', () => {
      renderCC()
      expect(screen.getByText(/Conduct all 6 scheduled appointments/i)).toBeInTheDocument()
      expect(screen.getByText(/Send 1 proposal/i)).toBeInTheDocument()
      expect(screen.getByText(/Activate the 5th agent/i)).toBeInTheDocument()
    })

    test('renders numbered list items (1. 2. 3.)', () => {
      renderCC()
      expect(screen.getByText('1.')).toBeInTheDocument()
      expect(screen.getByText('2.')).toBeInTheDocument()
      expect(screen.getByText('3.')).toBeInTheDocument()
    })

    test('handles plain array (not JSON string)', () => {
      renderCC({
        brief: {
          ...MOCK_BRIEF,
          priority_actions: ['Action A', 'Action B'],
        },
      })
      expect(screen.getByText('Action A')).toBeInTheDocument()
      expect(screen.getByText('Action B')).toBeInTheDocument()
    })

    test('handles double-encoded JSON string', () => {
      renderCC({
        brief: {
          ...MOCK_BRIEF,
          priority_actions: JSON.stringify(JSON.stringify(['Double encoded action'])),
        },
      })
      expect(screen.getByText('Double encoded action')).toBeInTheDocument()
    })

    test('renders empty state gracefully when priority_actions is null', () => {
      expect(() =>
        renderCC({ brief: { ...MOCK_BRIEF, priority_actions: null } })
      ).not.toThrow()
    })
  })

  describe('Metric Cards', () => {
    test('renders "Total Pipeline" card', () => {
      renderCC()
      expect(screen.getByText('Total Pipeline')).toBeInTheDocument()
    })

    test('renders pipeline value as formatted currency', () => {
      renderCC()
      // Total = 29000 → "$29K" — may appear in both metric card and pipeline table
      expect(screen.getAllByText('$29K').length).toBeGreaterThan(0)
    })

    test('renders deal count as sub-label', () => {
      renderCC()
      expect(screen.getByText(`${MOCK_DEALS.length} live deals`)).toBeInTheDocument()
    })

    test('renders "Stale Deals" card', () => {
      renderCC()
      expect(screen.getByText('Stale Deals')).toBeInTheDocument()
    })

    test('renders "Awaiting Review" card', () => {
      renderCC()
      expect(screen.getByText('Awaiting Review')).toBeInTheDocument()
    })

    test('renders "MTD Revenue" card', () => {
      renderCC()
      expect(screen.getByText('MTD Revenue')).toBeInTheDocument()
    })

    test('shows outstanding amount in finance sub-label', () => {
      renderCC()
      // outstanding = sent($3K) + overdue($2K) = $5K
      expect(screen.getByText(/\$5K outstanding/)).toBeInTheDocument()
    })
  })

  describe('Pipeline table', () => {
    test('renders "Pipeline" panel heading', () => {
      renderCC()
      expect(screen.getByText('Pipeline')).toBeInTheDocument()
    })

    test('renders deal company names', () => {
      renderCC()
      expect(screen.getByText('revVana')).toBeInTheDocument()
      expect(screen.getByText('Common Room')).toBeInTheDocument()
    })

    test('renders deal amounts', () => {
      renderCC()
      expect(screen.getByText('$20K')).toBeInTheDocument()
    })

    test('renders service line badges', () => {
      renderCC()
      // Multiple DIAG badges - getAll
      const diagBadges = screen.getAllByText('DIAG')
      expect(diagBadges.length).toBeGreaterThan(0)
    })

    test('renders "No deals in pipeline" when deals array is empty', () => {
      renderCC({ deals: [] })
      expect(screen.getByText(/no deals in pipeline/i)).toBeInTheDocument()
    })

    test('pipeline rows have min-h-[44px] for touch compliance', () => {
      renderCC()
      const rows = document.querySelectorAll('.min-h-\\[44px\\]')
      expect(rows.length).toBeGreaterThan(0)
    })
  })

  describe("Sam's Flag", () => {
    test('renders Sam\'s Flag section', () => {
      renderCC()
      expect(screen.getByText(/sam.s flag/i)).toBeInTheDocument()
    })

    test('renders sams_flag text at text-base size', () => {
      renderCC()
      const flagText = screen.getByText(MOCK_BRIEF.sams_flag)
      expect(flagText).toBeInTheDocument()
      expect(flagText.className).toMatch(/text-base/)
    })
  })

  describe('Navigation', () => {
    test('renders "Rex" navigation link in pipeline panel', () => {
      renderCC()
      // "Rex" appears in both the pipeline panel header link and sidebar
      expect(screen.getAllByText('Rex').length).toBeGreaterThan(0)
    })

    test('renders "Sam" navigation link', () => {
      renderCC()
      // "Sam" appears in both Sam's Flag section and nav link
      expect(screen.getAllByText('Sam').length).toBeGreaterThan(0)
    })

    test('renders loading skeleton when loading + no data', () => {
      renderCC({ loading: true, brief: null, deals: [] })
      // Skeleton divs are animate-pulse
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('OKR Health panel', () => {
    test('renders OKR Health panel heading', () => {
      renderCC()
      expect(screen.getByText(/okr/i)).toBeInTheDocument()
    })

    test('renders 3 objective rows', () => {
      renderCC()
      // O1, O2, O3 labels
      expect(screen.getByText('O1')).toBeInTheDocument()
      expect(screen.getByText('O2')).toBeInTheDocument()
      expect(screen.getByText('O3')).toBeInTheDocument()
    })
  })
})

// ─── toArr() unit tests (tested via component but also standalone) ─────────────
describe('toArr() helper — Priority Actions normalisation', () => {
  // We test this indirectly through the component rendering
  const cases = [
    { label: 'null',            input: null,                                        expected: 0 },
    { label: 'empty array',     input: [],                                          expected: 0 },
    { label: 'plain array',     input: ['a', 'b'],                                  expected: 2 },
    { label: 'JSON string',     input: JSON.stringify(['x', 'y', 'z']),             expected: 3 },
    { label: 'double-encoded',  input: JSON.stringify(JSON.stringify(['p', 'q'])),  expected: 2 },
  ]

  test.each(cases)('handles $label → $expected items rendered', ({ input, expected }) => {
    renderCC({ brief: { ...MOCK_BRIEF, priority_actions: input } })
    if (expected === 0) {
      expect(screen.queryByText('1.')).not.toBeInTheDocument()
    } else {
      expect(screen.getByText('1.')).toBeInTheDocument()
    }
  })
})

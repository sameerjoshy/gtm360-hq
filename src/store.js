import { create } from 'zustand'
import { supabase } from './lib/supabase'

export const useAppStore = create((set) => ({
  brief:          null,
  deals:          [],
  okrs:           [],
  content:        [],
  finance:        [],
  escalationCount: 0,
  loading:        false,
  lastRefresh:    null,

  refresh: async () => {
    set({ loading: true })

    const [b, d, o, c, f, e] = await Promise.all([
      supabase
        .from('daily_brief')
        .select('*')
        .order('brief_date', { ascending: false })
        .limit(1),

      supabase
        .from('pipeline_snapshot')
        .select('*')
        .order('amount', { ascending: false }),

      supabase
        .from('okr_tracker')
        .select('*')
        .order('objective_number')
        .order('kr_number'),

      supabase
        .from('content_queue')
        .select('*')
        .in('status', ['review', 'drafting', 'raw'])
        .limit(8),

      supabase
        .from('finance_tracker')
        .select('*')
        .order('issue_date', { ascending: false })
        .limit(10),

      supabase
        .from('escalations')
        .select('id', { count: 'exact' })
        .eq('status', 'open'),
    ])

    set({
      brief:           b.data?.[0]  || null,
      deals:           d.data       || [],
      okrs:            o.data       || [],
      content:         c.data       || [],
      finance:         f.data       || [],
      escalationCount: e.count      || 0,
      loading:         false,
      lastRefresh:     new Date(),
    })
  },
}))

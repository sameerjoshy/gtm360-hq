import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Briefcase, Mic, Megaphone } from 'lucide-react'
import { supabase, fmt$, getCompanyName } from '../lib/supabase'

const QUICK_ACTIONS = [
  { label: '/research [company]', desc: 'Run Rex research', icon: Briefcase, path: '/rex' },
  { label: '/post [observation]', desc: 'Draft with Andy',  icon: Megaphone, path: '/andy' },
  { label: '/today',              desc: 'Run Sam brief',    icon: Mic,        path: '/sam' },
  { label: '/campaign',          desc: 'Pipeline dashboard', icon: Briefcase, path: '/rex' },
]

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [deals, setDeals] = useState([])
  const navigate = useNavigate()
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
      supabase
        .from('pipeline_snapshot')
        .select('company_name, stage, service_line, amount')
        .order('amount', { ascending: false })
        .limit(10)
        .then(({ data }) => setDeals(data || []))
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const filtered = query
    ? deals.filter(d => d.company_name.toLowerCase().includes(query.toLowerCase()))
    : deals

  const filteredActions = query
    ? QUICK_ACTIONS.filter(a =>
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        a.desc.toLowerCase().includes(query.toLowerCase())
      )
    : QUICK_ACTIONS

  const go = (path) => { navigate(path); onClose() }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Palette */}
      <div className="relative w-full max-w-lg bg-bg-s1 border border-bdr rounded-xl shadow-2xl overflow-hidden">

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-bdr">
          <Search size={15} className="text-text-mut shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search companies..."
            className="flex-1 bg-transparent text-sm text-text-pri placeholder-text-mut outline-none"
          />
          <kbd className="text-xxs bg-bg-base px-1.5 py-0.5 rounded border border-bdr font-mono text-text-mut">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">

          {filteredActions.length > 0 && (
            <div>
              <div className="section-label">Quick Actions</div>
              {filteredActions.map((a, i) => (
                <button
                  key={i}
                  onClick={() => go(a.path)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-s2 text-left transition-colors"
                >
                  <a.icon size={14} className="text-gtm-orange shrink-0" />
                  <span className="text-sm font-mono text-text-pri">{a.label}</span>
                  <span className="text-xs text-text-mut ml-auto">{a.desc}</span>
                </button>
              ))}
            </div>
          )}

          {filtered.length > 0 && (
            <div>
              <div className="section-label mt-1">Companies</div>
              {filtered.map((d, i) => (
                <button
                  key={i}
                  onClick={() => go('/rex')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-s2 text-left transition-colors"
                >
                  <div className="w-6 h-6 rounded bg-bg-s2 border border-bdr flex items-center justify-center shrink-0">
                    <span className="text-xxs font-mono text-text-sec">{d.company_name?.[0]}</span>
                  </div>
                  <span className="text-sm text-text-pri flex-1">{getCompanyName(d)}</span>
                  <span className="badge-muted">{d.service_line}</span>
                  <span className="text-xs font-mono text-text-sec">{fmt$(d.amount)}</span>
                </button>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

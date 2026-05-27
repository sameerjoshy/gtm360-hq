import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AlertTriangle, CheckCircle, Clock, Circle } from 'lucide-react'

const STATUS_BADGE = {
  open:     'badge-danger',
  resolved: 'badge-green',
}

export default function ErrorsView() {
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    supabase
      .from('error_log')
      .select('*')
      .order('error_time', { ascending: false })
      .limit(50)
      .then(({ data }) => { setErrors(data || []); setLoading(false) })
  }, [])

  const filtered = filter === 'All' ? errors : errors.filter(e => e.status === filter.toLowerCase())
  const openCount = errors.filter(e => e.status === 'open').length

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-bdr shrink-0">
        <AlertTriangle size={14} className="text-gtm-orange" />
        <span className="font-display text-lg tracking-wide">Errors</span>
        <span className="text-text-mut text-xs font-mono">— System Log</span>
        <div className="flex-1" />
        {openCount > 0 ? (
          <span className="badge-danger flex items-center gap-1">
            <AlertTriangle size={9} /> {openCount} open
          </span>
        ) : (
          <span className="badge-green flex items-center gap-1">
            <CheckCircle size={9} /> All clear
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0 border-b border-bdr px-5 shrink-0">
        {['All', 'Open', 'Resolved'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-2 text-xs font-mono border-b-2 transition-colors ${
              filter === s ? 'border-gtm-orange text-gtm-orange' : 'border-transparent text-text-mut hover:text-text-sec'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-bg-s2 rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-ok/10 border border-ok/20 flex items-center justify-center">
              <CheckCircle size={22} className="text-ok" />
            </div>
            <div>
              <div className="text-sm text-text-sec">No errors logged</div>
              <div className="text-xs text-text-mut mt-1 font-mono">All agents and automations running clean</div>
            </div>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-bg-s1 z-10">
              <tr className="border-b border-bdr">
                {['Time', 'Agent', 'Automation', 'Type', 'Message', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-text-mut font-mono text-xxs uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-bdr">
              {filtered.map((err) => (
                <tr key={err.id} className="hover:bg-bg-s2 transition-colors">
                  <td className="px-4 py-3 font-mono text-xxs text-text-mut whitespace-nowrap">
                    {err.error_time ? new Date(err.error_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-text-sec whitespace-nowrap">{err.agent_name || '—'}</td>
                  <td className="px-4 py-3 text-text-sec whitespace-nowrap">{err.automation_name || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="badge-muted">{err.error_type || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-text-sec max-w-xs truncate">{err.error_message || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={STATUS_BADGE[err.status] || 'badge-muted'}>{err.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

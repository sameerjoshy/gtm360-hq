import { useEffect, useState } from 'react'
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function NotificationPanel({ open, onClose }) {
  const [escalations, setEscalations] = useState([])
  const [loading, setLoading]         = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    supabase
      .from('escalations')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setEscalations(data || [])
        setLoading(false)
      })
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-80 bg-bg-s1 border-l border-bdr h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-bdr sticky top-0 bg-bg-s1 z-10">
          <div>
            <div className="font-display text-base tracking-wide text-text-pri">Notifications</div>
            {escalations.length > 0 && (
              <div className="text-xxs font-mono text-warn mt-0.5">{escalations.length} open escalation{escalations.length > 1 ? 's' : ''}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="btn-ghost p-1.5 rounded-md cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-bg-s2 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : escalations.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <CheckCircle2 size={28} className="text-ok" />
              <div className="text-xs text-text-mut text-center">No open notifications.<br />System is clean.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {escalations.map((esc, i) => (
                <div key={i} className="card p-3 border-l-2 border-warn">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={12} className="text-warn shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs text-text-pri font-medium truncate">
                        {esc.escalation_type || 'Escalation'}
                      </div>
                      <div className="text-xxs text-text-sec mt-0.5 leading-relaxed">
                        {esc.description}
                      </div>
                      {esc.decision_needed && (
                        <div className="text-xxs font-mono text-warn mt-1.5 border border-warn/20 bg-warn/5 px-2 py-1 rounded">
                          Decision needed: {esc.decision_needed}
                        </div>
                      )}
                      {esc.sams_recommendation && (
                        <div className="text-xxs text-text-mut mt-1 italic leading-relaxed">
                          Sam: {esc.sams_recommendation}
                        </div>
                      )}
                      <div className="text-xxs font-mono text-text-mut mt-1.5">
                        Raised by {esc.raised_by || 'System'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

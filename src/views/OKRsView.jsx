import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Target, TrendingUp } from 'lucide-react'

const STATUS_BADGE = {
  on_track:  'badge-green',
  at_risk:   'badge-warn',
  off_track: 'badge-danger',
}

const BAR_COLOR = {
  on_track:  '#059669',
  at_risk:   '#D97706',
  off_track: '#EF4444',
}

export default function OKRsView() {
  const [okrs, setOkrs]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('okr_tracker')
      .select('*')
      .order('objective_number')
      .order('kr_number')
      .then(({ data }) => { setOkrs(data || []); setLoading(false) })
  }, [])

  const objectives = [...new Set(okrs.map(k => k.objective_number))].map(n => ({
    n,
    text:   okrs.find(k => k.objective_number === n)?.objective_text || `Objective ${n}`,
    krs:    okrs.filter(k => k.objective_number === n),
  }))

  const overallPct = () => {
    if (!okrs.length) return 0
    const target = okrs.reduce((s, k) => s + Number(k.kr_target || 0), 0)
    const curr   = okrs.reduce((s, k) => s + Number(k.kr_current || 0), 0)
    return target > 0 ? Math.round(curr / target * 100) : 0
  }

  const objPct = (krs) => {
    const target = krs.reduce((s, k) => s + Number(k.kr_target || 0), 0)
    const curr   = krs.reduce((s, k) => s + Number(k.kr_current || 0), 0)
    return target > 0 ? Math.min(100, Math.round(curr / target * 100)) : 0
  }

  const krPct = (kr) =>
    kr.kr_target > 0 ? Math.min(100, Math.round(Number(kr.kr_current) / Number(kr.kr_target) * 100)) : 0

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-bdr shrink-0">
        <Target size={14} className="text-gtm-orange" />
        <span className="font-display text-lg tracking-wide">OKRs</span>
        <span className="text-text-mut text-xs font-mono">— Q2 2026</span>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <TrendingUp size={12} className="text-text-mut" />
          <span className="text-xs font-mono text-text-sec">Overall</span>
          <span className={`text-xs font-mono font-bold ${overallPct() < 40 ? 'text-danger' : overallPct() < 70 ? 'text-warn' : 'text-ok'}`}>
            {overallPct()}%
          </span>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="px-5 py-2 border-b border-bdr shrink-0">
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${overallPct()}%`,
              background: overallPct() < 40 ? '#EF4444' : overallPct() < 70 ? '#D97706' : '#059669',
            }}
          />
        </div>
      </div>

      {/* OKR table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-5 space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-3 animate-pulse">
                <div className="h-4 bg-bg-s2 rounded w-1/2" />
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex gap-4 items-center pl-4">
                    <div className="h-2.5 bg-bg-s2 rounded flex-1" />
                    <div className="h-1.5 bg-bg-s2 rounded w-32" />
                    <div className="h-2.5 bg-bg-s2 rounded w-16" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 space-y-8">
            {objectives.map(o => {
              const pct = objPct(o.krs)
              const worstStatus = o.krs.some(k => k.status === 'off_track') ? 'off_track'
                : o.krs.some(k => k.status === 'at_risk') ? 'at_risk' : 'on_track'
              return (
                <div key={o.n} className="space-y-3">
                  {/* Objective header */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gtm-orange/10 border border-gtm-orange/20 flex items-center justify-center shrink-0">
                      <span className="font-display text-gtm-orange text-sm">O{o.n}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-pri font-medium">{o.text}</div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <div className="progress-track w-32">
                          <div
                            className="progress-fill"
                            style={{ width: `${pct}%`, background: BAR_COLOR[worstStatus] }}
                          />
                        </div>
                        <span className="text-xxs font-mono text-text-sec">{pct}%</span>
                      </div>
                    </div>
                    <span className={STATUS_BADGE[worstStatus] || 'badge-muted'}>
                      {worstStatus.replace('_', ' ')}
                    </span>
                  </div>

                  {/* KRs */}
                  <div className="pl-11 space-y-2.5 border-l-2 border-bdr ml-4">
                    {o.krs.map((kr) => {
                      const pct = krPct(kr)
                      const barColor = BAR_COLOR[kr.status] || BAR_COLOR.at_risk
                      return (
                        <div key={kr.id} className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-xxs font-mono text-text-mut w-6 shrink-0">KR{kr.kr_number}</span>
                            <span className="text-xs text-text-sec flex-1">{kr.kr_text}</span>
                            <span className="text-xxs font-mono text-text-sec shrink-0">
                              {/brief|daily/i.test(kr.kr_text)
                                ? `${kr.kr_current} sessions`
                                : `${kr.kr_current} / ${kr.kr_target}`}
                            </span>
                            <span className={`text-xxs font-mono shrink-0 w-8 text-right ${
                              pct === 100 ? 'text-ok' : pct >= 60 ? 'text-warn' : 'text-danger'
                            }`}>
                              {pct}%
                            </span>
                          </div>
                          <div className="pl-9">
                            <div className="progress-track">
                              <div
                                className="progress-fill"
                                style={{ width: `${pct}%`, background: barColor }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Q2 context */}
            <div className="border-t border-bdr pt-4">
              <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-2">Q2 Context</div>
              <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                <div className="card px-3 py-2">
                  <div className="text-text-sec">Quarter</div>
                  <div className="text-text-pri font-medium">Q2 2026</div>
                </div>
                <div className="card px-3 py-2">
                  <div className="text-text-sec">Period</div>
                  <div className="text-text-pri font-medium">Apr – Jun</div>
                </div>
                <div className="card px-3 py-2">
                  <div className="text-text-sec">Owner</div>
                  <div className="text-text-pri font-medium">Sameer Joshi</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

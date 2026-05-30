import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase, fmt$ } from '../lib/supabase'
import { useAppStore } from '../store'
import { fetchProposals } from '../lib/prop'
import { DollarSign, Send, Loader2, TrendingUp, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react'

// ─── Finn system prompt ───────────────────────────────────────────────────────
const FINN_SYSTEM = `You are Finn, the fractional CFO for GTM360. You handle revenue tracking, invoicing, pricing, forecasting, and commercial deal structure. You give sharp financial guidance with specific numbers.

GTM360 services:
• DIAG (GTM Diagnostic): $3K–$8K one-time
• FCRO (Fractional CRO): $5K–$20K/month retainer
• ROPS (RevOps Audit): $4K–$15K one-time

/invoice — Draft or review an invoice. Include client, service, amount, due date.
/price — Give pricing recommendation based on deal context (company size, service, ICP fit).
/forecast — Provide a revenue forecast based on pipeline and current retainers.
/pl — Summarize current P&L position (MTD revenue, outstanding, margin).
/commercial — Help structure a commercial deal or negotiate terms.

Be concise. Use specific numbers. Always give a recommendation. No filler.`

// ─── Invoice status config ────────────────────────────────────────────────────
const INV_STATUS = {
  paid:        { badge: 'badge-green',  icon: CheckCircle, color: 'text-ok'      },
  outstanding: { badge: 'badge-orange', icon: AlertCircle, color: 'text-gtm-orange' },
  sent:        { badge: 'badge-warn',   icon: Clock,       color: 'text-warn'    },
  draft:       { badge: 'badge-muted',  icon: Clock,       color: 'text-text-mut' },
}

// ─── Streaming chat hook ──────────────────────────────────────────────────────
function useFinnChat(invoices, deals) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Ready. Run /invoice, /price, /forecast, or /pl to get started.",
    done: true,
  }])
  const [isStreaming, setStreaming] = useState(false)
  const abortRef = useRef(null)

  const buildContext = () => {
    const paid   = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0)
    const owed   = invoices.filter(i => ['outstanding', 'sent'].includes(i.status)).reduce((s, i) => s + (i.amount || 0), 0)
    const pipe   = deals.reduce((s, d) => s + (d.amount || 0), 0)
    return `\n\n[Financial context: MTD Revenue $${Math.round(paid/1000)}K | Outstanding $${Math.round(owed/1000)}K | Pipeline $${Math.round(pipe/1000)}K | Active deals: ${deals.length}]`
  }

  const send = useCallback(async (userText) => {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    const hasKey = apiKey && apiKey !== 'your-anthropic-api-key-here'

    const history = [...messages, { role: 'user', content: userText + buildContext(), done: true }]
      .filter(m => m.content).map(({ role, content }) => ({ role, content }))

    setMessages(prev => [...prev, { role: 'user', content: userText, done: true }])

    if (!hasKey) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Add VITE_ANTHROPIC_API_KEY to .env.local to enable Finn.',
        done: true, isError: true,
      }])
      return
    }

    if (isStreaming) return
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '', done: false }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-7',
          max_tokens: 1500,
          stream: true,
          thinking: { type: 'adaptive' },
          system: FINN_SYSTEM,
          messages: history,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message || `HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const json = line.slice(6).trim()
          if (json === '[DONE]') continue
          try {
            const evt = JSON.parse(json)
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = {
                  ...copy[copy.length - 1],
                  content: copy[copy.length - 1].content + evt.delta.text,
                }
                return copy
              })
            }
          } catch { /* skip */ }
        }
      }
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { ...copy[copy.length - 1], done: true }
        return copy
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: `Error: ${err.message}`, done: true, isError: true }
          return copy
        })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming, messages, invoices, deals])

  const stop = useCallback(() => abortRef.current?.abort(), [])
  return { messages, isStreaming, send, stop }
}

// ─── Subcomponents ────────────────────────────────────────────────────────────
function StreamCursor() {
  return <span className="inline-block w-[3px] h-[13px] bg-gtm-orange rounded-sm ml-0.5 align-middle animate-pulse" />
}

function MetricCard({ label, value, sub, accent }) {
  return (
    <div className="card px-4 py-3">
      <div className={`font-display text-2xl tracking-wide ${accent || 'text-text-pri'}`}>{value}</div>
      <div className="text-xs text-text-sec mt-0.5">{label}</div>
      {sub && <div className="text-xxs text-text-mut font-mono mt-0.5">{sub}</div>}
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function FinnView() {
  const [invoices, setInvoices]   = useState([])
  const [proposals, setProposals] = useState([])
  const [loading, setLoading]     = useState(true)
  const [input, setInput]         = useState('')
  const chatEndRef              = useRef(null)
  const deals                   = useAppStore(s => s.deals)
  const { messages, isStreaming, send, stop } = useFinnChat(invoices, deals)

  useEffect(() => {
    supabase
      .from('finance_tracker')
      .select('*')
      .eq('record_type', 'invoice')
      .order('issue_date', { ascending: false })
      .then(({ data }) => { setInvoices(data || []); setLoading(false) })

    fetchProposals().then(data => setProposals(data)).catch(() => {})
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Computed metrics
  const mtdRevenue = invoices
    .filter(i => i.status === 'paid' && i.issue_date?.startsWith('2026-05'))
    .reduce((s, i) => s + (i.amount || 0), 0)
  const outstanding = invoices
    .filter(i => ['outstanding', 'sent'].includes(i.status))
    .reduce((s, i) => s + (i.amount || 0), 0)
  const totalPipeline = deals.reduce((s, d) => s + (d.amount || 0), 0)
  const activeClients = [...new Set(invoices.filter(i => ['outstanding', 'paid'].includes(i.status)).map(i => i.client_name))].length

  const handleSend = () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    send(text)
  }

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-bdr shrink-0">
        <div className="flex items-center gap-2">
          <DollarSign size={14} className="text-gtm-orange" />
          <span className="font-display text-lg tracking-wide">Finn</span>
          <span className="text-text-mut text-xs font-mono">— CFO</span>
        </div>
        <div className="flex-1" />
        {isStreaming && <Loader2 size={13} className="text-gtm-orange animate-spin" />}
        <span className="text-xxs font-mono text-text-mut bg-bg-s2 border border-bdr px-2 py-0.5 rounded">
          Demo Data
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 px-5 py-3 border-b border-bdr shrink-0">
        <MetricCard label="MTD Revenue"    value={fmt$(mtdRevenue)}    accent="text-gtm-orange" />
        <MetricCard label="Outstanding"    value={fmt$(outstanding)}   sub={`${invoices.filter(i => ['outstanding','sent'].includes(i.status)).length} invoices`} accent={outstanding > 0 ? 'text-warn' : 'text-text-pri'} />
        <MetricCard label="Pipeline"       value={fmt$(totalPipeline)} sub={`${deals.length} deals`} />
        <MetricCard label="Active Clients" value={String(activeClients)} />
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Left: invoices + pricing */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 border-r border-bdr">

          {/* Invoices */}
          <div>
            <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-2">Invoices</div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 bg-bg-s2 rounded animate-pulse" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-xs text-text-mut py-4">No invoices yet — ask Finn to draft one</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-bdr">
                    {['Client', 'Service', 'Amount', 'Due', 'Status'].map(h => (
                      <th key={h} className="text-left py-2 pr-4 text-text-mut font-mono text-xxs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-bdr">
                  {invoices.map((inv, i) => {
                    const cfg = INV_STATUS[inv.status] || INV_STATUS.draft
                    return (
                      <tr key={i} className="hover:bg-bg-s2 transition-colors">
                        <td className="py-3.5 pr-4 text-text-pri font-medium">{inv.client_name}</td>
                        <td className="py-3.5 pr-4 text-text-sec">{inv.service_line}</td>
                        <td className="py-3.5 pr-4 font-mono text-text-pri">{fmt$(inv.amount)}</td>
                        <td className="py-3.5 pr-4 font-mono text-text-sec text-xs">
                          {inv.due_date || '—'}
                        </td>
                        <td className="py-3.5">
                          <span className={cfg.badge}>{inv.status}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* P&L Summary */}
          <div>
            <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-2">P&amp;L — May 2026</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Revenue', fmt$(mtdRevenue), 'text-ok'],
                ['Outstanding', fmt$(outstanding), outstanding > 0 ? 'text-warn' : 'text-text-sec'],
                ['Projected', fmt$(mtdRevenue + outstanding), 'text-text-pri'],
              ].map(([l, v, c]) => (
                <div key={l} className="card p-3">
                  <div className={`font-display text-xl ${c}`}>{v}</div>
                  <div className="text-xxs text-text-mut mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Proposals pipeline */}
          <div>
            <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-2">Proposals</div>
            {proposals.length === 0 ? (
              <div className="text-xs text-text-mut py-3 flex items-center gap-2">
                <FileText size={12} />
                No proposals generated yet — use Prop to write one.
              </div>
            ) : (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    ['Draft',    proposals.filter(p => p.status === 'draft').length,    'text-text-mut'],
                    ['Approved', proposals.filter(p => p.status === 'approved').length, 'text-ok'],
                    ['Sent',     proposals.filter(p => p.status === 'sent').length,     'text-gtm-orange'],
                    ['Signed',   proposals.filter(p => p.status === 'signed').length,   'text-info'],
                  ].map(([label, count, color]) => (
                    <div key={label} className="card p-2.5 text-center">
                      <div className={`font-display text-lg ${color}`}>{count}</div>
                      <div className="text-xxs text-text-mut font-mono">{label}</div>
                    </div>
                  ))}
                </div>
                {/* Total value */}
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-text-mut font-mono">Total proposal value</span>
                  <span className="font-mono text-gtm-orange font-medium">
                    {fmt$(proposals.reduce((s, p) => s + (p.investment_amount || 0), 0))}
                  </span>
                </div>
                {/* Recent proposals list */}
                <div className="space-y-1.5">
                  {proposals.slice(0, 5).map(p => {
                    const statusCls = {
                      draft: 'badge-muted', approved: 'badge-green',
                      sent: 'badge-orange', signed: 'bg-ok-light text-ok text-xxs font-mono px-1.5 py-0.5 rounded',
                    }[p.status] || 'badge-muted'
                    return (
                      <div key={p.id} className="flex items-center gap-3 text-xs">
                        <span className="text-text-pri font-medium flex-1 truncate">{p.company_name}</span>
                        <span className="text-xxs text-text-mut font-mono">{p.service_line}</span>
                        <span className="font-mono text-text-pri">{fmt$(p.investment_amount || 0)}</span>
                        <span className={statusCls}>{p.status}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Pricing reference */}
          <div>
            <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-2">Pricing Reference</div>
            <div className="space-y-1.5">
              {[
                ['DIAG', 'GTM Diagnostic',   '$3K–$8K',         'one-time'],
                ['FCRO', 'Fractional CRO',   '$5K–$20K/mo',     'retainer'],
                ['ROPS', 'RevOps Audit',     '$4K–$15K',        'one-time'],
              ].map(([code, name, range, type]) => (
                <div key={code} className="flex items-center gap-3 text-xs">
                  <span className="badge-orange w-12 text-center">{code}</span>
                  <span className="text-text-sec flex-1">{name}</span>
                  <span className="font-mono text-text-pri">{range}</span>
                  <span className="text-xxs text-text-mut font-mono">{type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue trend placeholder */}
          <div>
            <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-2">Revenue Trend — Q2 2026</div>
            <div className="flex items-end gap-1 h-16">
              {[
                { mo: 'Mar', val: 8,  paid: true  },
                { mo: 'Apr', val: 13, paid: true  },
                { mo: 'May', val: 12, paid: false },
              ].map((m) => (
                <div key={m.mo} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-sm transition-all ${m.paid ? 'bg-gtm-orange' : 'bg-gtm-orange/30 border border-gtm-orange/40'}`}
                    style={{ height: `${m.val * 4}px` }}
                  />
                  <span className="text-xxs font-mono text-text-mut">{m.mo}</span>
                </div>
              ))}
            </div>
            <div className="text-xxs text-text-mut font-mono mt-1">${'$'}K | shaded = projected</div>
          </div>
        </div>

        {/* Finn chat */}
        <div className="w-[300px] shrink-0 flex flex-col bg-bg-base border-l border-bdr">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-bdr shrink-0">
            <div className="w-5 h-5 rounded-full bg-gtm-orange/20 border border-gtm-orange/40 flex items-center justify-center">
              <DollarSign size={9} className="text-gtm-orange" />
            </div>
            <span className="text-xs font-mono text-text-sec">Finn — CFO</span>
            {isStreaming && <Loader2 size={11} className="ml-auto text-gtm-orange animate-spin" />}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => {
              const isLast = i === messages.length - 1
              return (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-gtm-orange/20 border border-gtm-orange/40 flex items-center justify-center shrink-0 mt-0.5">
                      <DollarSign size={10} className="text-gtm-orange" />
                    </div>
                  )}
                  <div className={`max-w-[88%] text-xs leading-relaxed px-2.5 py-2 rounded-lg whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-gtm-orange/10 border border-gtm-orange/20 text-text-pri'
                      : msg.isError
                        ? 'bg-danger/5 border border-danger/20 text-danger'
                        : 'bg-bg-s2 border border-bdr text-text-sec'
                  }`}>
                    {msg.content}
                    {msg.role === 'assistant' && isLast && !msg.done && (
                      <StreamCursor />
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-bdr p-2 space-y-1.5 shrink-0">
            <div className="flex gap-1 flex-wrap">
              {['/invoice', '/price', '/forecast', '/pl'].map(p => (
                <button
                  key={p}
                  onClick={() => setInput(p + ' ')}
                  className="text-xxs font-mono bg-bg-s2 border border-bdr text-text-sec px-1.5 py-0.5 rounded hover:border-gtm-orange/40 hover:text-gtm-orange transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask Finn…"
                className="input-base text-xs py-1.5"
                disabled={isStreaming}
              />
              {isStreaming ? (
                <button onClick={stop} className="btn-ghost px-2 border border-danger/30 text-danger hover:bg-danger/10">
                  <div className="w-2 h-2 bg-danger rounded-sm" />
                </button>
              ) : (
                <button onClick={handleSend} className="btn-primary px-2" disabled={!input.trim()}>
                  <Send size={11} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

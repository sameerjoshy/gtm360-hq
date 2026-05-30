import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  FileText, Loader2, AlertCircle, CheckCircle,
  Copy, RefreshCw, Send, Edit2, X, Check,
  ChevronRight, DollarSign,
} from 'lucide-react'
import { supabase, fmt$, getCompanyName } from '../lib/supabase'
import {
  generateProposal, saveProposal, approveProposal,
  markProposalSent, updateProposalSection, fetchProposals,
} from '../lib/prop'

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  draft:    { label: 'Draft',    cls: 'badge-muted'   },
  approved: { label: 'Approved', cls: 'badge-green'   },
  sent:     { label: 'Sent',     cls: 'badge-orange'  },
  signed:   { label: 'Signed',   cls: 'bg-ok-light text-ok text-xxs font-mono px-1.5 py-0.5 rounded' },
}

const SERVICE_LABELS = { DIAG: 'GTM Diagnostic', FCRO: 'Fractional CRO', ROPS: 'RevOps Audit' }

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionBlock({ title, children, borderColor = 'border-bdr' }) {
  return (
    <div className={`border-l-2 ${borderColor} pl-4`}>
      <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-2">{title}</div>
      <div className="text-sm text-text-sec leading-relaxed">{children}</div>
    </div>
  )
}

function ProposalRow({ proposal, isSelected, onClick }) {
  const cfg = STATUS_CFG[proposal.status] || STATUS_CFG.draft
  const date = proposal.created_at
    ? new Date(proposal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—'
  return (
    <tr
      onClick={onClick}
      className={`cursor-pointer border-b border-bdr/40 transition-colors ${
        isSelected ? 'bg-bg-s2' : 'hover:bg-bg-s2/60'
      }`}
    >
      <td className="py-3 px-4 text-sm font-medium text-text-pri">{proposal.company_name}</td>
      <td className="py-3 px-4">
        <span className="text-xxs font-mono text-text-sec">{proposal.service_line || '—'}</span>
      </td>
      <td className="py-3 px-4 font-mono text-sm text-gtm-orange font-medium">
        {fmt$(proposal.investment_amount || 0)}
      </td>
      <td className="py-3 px-4 text-xxs font-mono text-text-mut">v{proposal.version}</td>
      <td className="py-3 px-4"><span className={cfg.cls}>{cfg.label}</span></td>
      <td className="py-3 px-4 text-xxs text-text-mut font-mono">{date}</td>
    </tr>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function PropView() {
  const [searchParams] = useSearchParams()
  const preselectedDealId = searchParams.get('deal')

  // Data
  const [proposals, setProposals]   = useState([])
  const [deals, setDeals]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected]     = useState(null)

  // Generator form
  const [selectedDealId, setSelectedDealId] = useState(preselectedDealId || '')
  const [serviceLine, setServiceLine]       = useState('DIAG')
  const [discoveryNotes, setDiscoveryNotes] = useState('')
  const [generating, setGenerating]         = useState(false)
  const [genStep, setGenStep]               = useState('')
  const [genError, setGenError]             = useState(null)

  // Actions on selected proposal
  const [approving, setApproving]           = useState(false)
  const [markingSent, setMarkingSent]       = useState(false)
  const [copied, setCopied]                 = useState(false)
  const [editing, setEditing]               = useState(false)
  const [editFields, setEditFields]         = useState({})
  const [saving, setSaving]                 = useState(false)

  // ── Load ─────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true)
    try {
      const data = await fetchProposals()
      setProposals(data)
      if (selected) {
        const updated = data.find(p => p.id === selected.id)
        if (updated) setSelected(updated)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [selected])

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    supabase
      .from('pipeline_snapshot')
      .select('deal_id,deal_name,company_name,company_domain,service_line,amount,icp_score,icp_fit,contact_name,stage')
      .order('amount', { ascending: false })
      .then(({ data }) => {
        const live = (data || []).filter(d => d.stage !== 'closedlost')
        setDeals(live)
        // If preselected deal, auto-set service line
        if (preselectedDealId) {
          const d = live.find(x => x.deal_id === preselectedDealId)
          if (d?.service_line) setServiceLine(d.service_line)
        }
      })
  }, [preselectedDealId])

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (generating) return
    const deal = deals.find(d => d.deal_id === selectedDealId)
    if (!deal) { setGenError('Select a company from the pipeline.'); return }
    if (!discoveryNotes.trim()) { setGenError('Paste discovery notes.'); return }

    setGenerating(true)
    setGenError(null)
    setGenStep('Starting…')

    try {
      const usedDeal = { ...deal, service_line: serviceLine }
      const proposal = await generateProposal({ deal: usedDeal, discoveryNotes }, setGenStep)
      setGenStep('Saving to Supabase…')
      const id = await saveProposal(usedDeal, proposal)
      setGenStep('Done')

      const fresh = await fetchProposals()
      setProposals(fresh)
      const newP = fresh.find(p => p.id === id)
      if (newP) setSelected(newP)

      // Reset form
      setDiscoveryNotes('')
      setGenStep('')
    } catch (e) {
      setGenError(e.message || 'Generation failed. Please retry.')
      setGenStep('')
    } finally {
      setGenerating(false)
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!selected || approving) return
    setApproving(true)
    try { await approveProposal(selected.id); await loadAll(true) }
    catch (e) { console.error(e) }
    finally { setApproving(false) }
  }

  const handleMarkSent = async () => {
    if (!selected || markingSent || selected.status !== 'approved') return
    setMarkingSent(true)
    try { await markProposalSent(selected.id); await loadAll(true) }
    catch (e) { console.error(e) }
    finally { setMarkingSent(false) }
  }

  const handleCopy = () => {
    if (!selected?.full_proposal_md) return
    navigator.clipboard.writeText(selected.full_proposal_md)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const startEdit = () => {
    if (!selected) return
    setEditFields({
      problem_statement:    selected.problem_statement    || '',
      what_we_heard:        selected.what_we_heard        || '',
      proposed_scope:       selected.proposed_scope       || '',
      timeline:             selected.timeline             || '',
      investment_amount:    selected.investment_amount    || 0,
      investment_structure: selected.investment_structure || '',
      terms:                selected.terms               || '',
    })
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await updateProposalSection(selected.id, editFields)
      setEditing(false)
      await loadAll(true)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  // Group by deal for version tabs
  const versions = proposals
    .filter(p => selected && p.deal_id === selected.deal_id && p.deal_id)
    .sort((a, b) => a.version - b.version)

  const selectedDeal = deals.find(d => d.deal_id === selectedDealId)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-bdr shrink-0">
        <FileText size={14} className="text-gtm-orange" />
        <span className="font-display text-lg tracking-wide">PROP</span>
        <span className="text-text-mut text-xs font-mono">— Proposal Writer</span>
        <div className="flex-1" />
        <button
          onClick={() => loadAll(true)}
          disabled={refreshing}
          className="btn-ghost text-xs border border-bdr flex items-center gap-1.5"
        >
          <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Generator section ── */}
      <div className="shrink-0 border-b border-bdr bg-bg-s1 px-5 py-4">
        <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-3">Generate New Proposal</div>
        <div className="flex gap-3 items-start">
          {/* Company */}
          <div className="w-52 shrink-0">
            <label className="block text-xxs font-mono text-text-mut mb-1">Company</label>
            <select
              value={selectedDealId}
              onChange={e => {
                setSelectedDealId(e.target.value)
                const d = deals.find(x => x.deal_id === e.target.value)
                if (d?.service_line) setServiceLine(d.service_line)
              }}
              className="input-base w-full text-sm py-2"
            >
              <option value="">— Select from pipeline —</option>
              {deals.map(d => (
                <option key={d.deal_id} value={d.deal_id}>
                  {getCompanyName(d)} {d.amount ? `(${fmt$(d.amount)})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Service line */}
          <div className="w-36 shrink-0">
            <label className="block text-xxs font-mono text-text-mut mb-1">Service</label>
            <select
              value={serviceLine}
              onChange={e => setServiceLine(e.target.value)}
              className="input-base w-full text-sm py-2"
            >
              <option value="DIAG">DIAG — Diagnostic</option>
              <option value="FCRO">FCRO — Fractional CRO</option>
              <option value="ROPS">ROPS — RevOps Audit</option>
            </select>
          </div>

          {/* Discovery notes */}
          <div className="flex-1">
            <label className="block text-xxs font-mono text-text-mut mb-1">Key points from discovery call</label>
            <textarea
              value={discoveryNotes}
              onChange={e => setDiscoveryNotes(e.target.value)}
              rows={3}
              placeholder="Paste key points from discovery call — their pain, what they said, what they care about…"
              className="input-base w-full text-sm py-2 resize-none"
            />
          </div>

          {/* Button + status */}
          <div className="shrink-0 pt-5 flex flex-col items-end gap-1.5">
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedDealId || !discoveryNotes.trim()}
              className="btn-orange text-xs flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating
                ? <><Loader2 size={11} className="animate-spin" /> Generating…</>
                : <><FileText size={11} /> Generate Proposal</>}
            </button>
            {genStep && !genError && (
              <div className="text-xxs font-mono text-text-mut">{genStep}</div>
            )}
            {genError && (
              <div className="flex items-center gap-1 text-xxs text-danger font-mono">
                <AlertCircle size={9} />{genError}
              </div>
            )}
          </div>
        </div>

        {/* Selected deal quick preview */}
        {selectedDeal && (
          <div className="flex items-center gap-3 mt-2 text-xxs font-mono text-text-mut">
            <span>{getCompanyName(selectedDeal)}</span>
            <span>·</span>
            <span className="text-gtm-orange">{fmt$(selectedDeal.amount || 0)}</span>
            <span>·</span>
            <span>ICP: {selectedDeal.icp_fit || '?'} ({selectedDeal.icp_score || '?'}/10)</span>
            <span>·</span>
            <span>{selectedDeal.contact_name || 'No contact'}</span>
          </div>
        )}
      </div>

      {/* ── Proposals table + detail ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Table (top-left when no selection, full-width) */}
        <div className={`flex flex-col overflow-hidden border-r border-bdr ${selected ? 'w-[42%] shrink-0' : 'flex-1'}`}>
          <div className="shrink-0 border-b border-bdr/40 bg-bg-s2 px-4 py-2">
            <div className="grid grid-cols-[1fr_56px_72px_36px_72px_60px] text-xxs font-mono text-text-mut uppercase tracking-wider gap-2">
              <span>Company</span><span>Service</span><span>Amount</span>
              <span>Ver</span><span>Status</span><span>Date</span>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 p-4 space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-bg-s2 rounded animate-pulse" />)}
            </div>
          ) : proposals.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
              <FileText size={20} className="text-text-mut" />
              <div>
                <div className="text-sm text-text-sec font-medium">No proposals yet</div>
                <div className="text-xs text-text-mut mt-1">Select a company above and paste discovery notes to generate the first proposal.</div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full">
                <tbody>
                  {proposals.map(p => (
                    <ProposalRow
                      key={p.id}
                      proposal={p}
                      isSelected={selected?.id === p.id}
                      onClick={() => { setSelected(p); setEditing(false) }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Proposal detail */}
        {selected && (
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Detail header */}
            <div className="shrink-0 border-b border-bdr px-5 py-3 bg-bg-s1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-display text-xl tracking-wide text-text-pri">
                      {selected.company_name}
                    </span>
                    <span className={STATUS_CFG[selected.status]?.cls || 'badge-muted'}>
                      {STATUS_CFG[selected.status]?.label || selected.status}
                    </span>
                    {selected.service_line && (
                      <span className="text-xxs font-mono text-text-mut bg-bg-s2 border border-bdr px-1.5 py-0.5 rounded">
                        {selected.service_line}
                      </span>
                    )}
                  </div>
                  {/* Version tabs */}
                  {versions.length > 1 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      {versions.map(v => (
                        <button
                          key={v.id}
                          onClick={() => { setSelected(v); setEditing(false) }}
                          className={`text-xxs font-mono px-2 py-0.5 rounded border transition-colors ${
                            v.id === selected.id
                              ? 'border-gtm-orange text-gtm-orange bg-gtm-orange/5'
                              : 'border-bdr text-text-mut hover:border-text-sec'
                          }`}
                        >
                          v{v.version}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Investment — prominent */}
                <div className="text-right shrink-0">
                  <div className="font-display text-3xl text-gtm-orange leading-none">
                    {fmt$(selected.investment_amount || 0)}
                  </div>
                  <div className="text-xxs text-text-mut font-mono mt-0.5">
                    {selected.investment_structure?.split('.')[0] || 'investment'}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {selected.status === 'draft' && (
                  <button
                    onClick={handleApprove}
                    disabled={approving}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    {approving ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                    ✅ Approve
                  </button>
                )}
                {selected.status === 'approved' && (
                  <button
                    onClick={handleMarkSent}
                    disabled={markingSent}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    {markingSent ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                    📤 Mark as Sent
                  </button>
                )}
                {selected.status === 'sent' && (
                  <span className="text-xxs font-mono text-ok flex items-center gap-1"><Check size={9} />Sent</span>
                )}
                {!editing && selected.status === 'draft' && (
                  <button onClick={startEdit} className="btn-ghost text-xs border border-bdr flex items-center gap-1.5">
                    <Edit2 size={11} /> ✏️ Edit
                  </button>
                )}
                <button onClick={handleCopy} className="btn-ghost text-xs border border-bdr flex items-center gap-1.5">
                  {copied ? <><CheckCircle size={11} className="text-ok" /> Copied</> : <><Copy size={11} /> 📋 Copy Markdown</>}
                </button>
                {editing && (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="btn-primary text-xs flex items-center gap-1.5"
                    >
                      {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      Save Changes
                    </button>
                    <button onClick={() => setEditing(false)} className="btn-ghost text-xs border border-bdr flex items-center gap-1.5">
                      <X size={11} /> Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Proposal sections */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {editing ? (
                /* Inline edit form */
                <div className="space-y-4 max-w-2xl">
                  {[
                    ['problem_statement',    'The Situation',       4],
                    ['what_we_heard',        'What We Heard',       4],
                    ['proposed_scope',       'What We Propose',     4],
                    ['timeline',             'Timeline',            2],
                    ['investment_structure', 'Investment Structure', 2],
                    ['terms',               'Terms',               2],
                  ].map(([key, label, rows]) => (
                    <div key={key}>
                      <label className="block text-xxs font-mono text-text-mut uppercase tracking-wider mb-1">{label}</label>
                      <textarea
                        value={editFields[key] || ''}
                        onChange={e => setEditFields(prev => ({ ...prev, [key]: e.target.value }))}
                        rows={rows}
                        className="input-base w-full text-sm py-2 resize-none"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xxs font-mono text-text-mut uppercase tracking-wider mb-1">Investment Amount ($)</label>
                    <input
                      type="number"
                      value={editFields.investment_amount || 0}
                      onChange={e => setEditFields(prev => ({ ...prev, investment_amount: Number(e.target.value) }))}
                      className="input-base w-48 text-sm py-2"
                    />
                  </div>
                </div>
              ) : (
                /* Read-only sections */
                <>
                  <SectionBlock title="1 — The Situation" borderColor="border-danger/60">
                    {selected.problem_statement || <em className="text-text-mut">Not generated.</em>}
                  </SectionBlock>

                  <SectionBlock title="2 — What We Heard" borderColor="border-warn/60">
                    {selected.what_we_heard || <em className="text-text-mut">Not generated.</em>}
                  </SectionBlock>

                  <SectionBlock title="3 — What We Propose" borderColor="border-gtm-orange/60">
                    <div className="whitespace-pre-wrap">{selected.proposed_scope || <em className="text-text-mut">Not generated.</em>}</div>
                    {selected.deliverables?.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {selected.deliverables.map((d, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <ChevronRight size={12} className="text-gtm-orange shrink-0 mt-0.5" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionBlock>

                  <SectionBlock title="4 — How We Work" borderColor="border-info/60">
                    {selected.timeline || <em className="text-text-mut">Not generated.</em>}
                  </SectionBlock>

                  <SectionBlock title="5 — The Investment" borderColor="border-ok/60">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-display text-2xl text-gtm-orange">
                        {fmt$(selected.investment_amount || 0)}
                      </span>
                    </div>
                    <div>{selected.investment_structure}</div>
                    {selected.terms && (
                      <div className="text-xs text-text-mut mt-1 font-mono">{selected.terms}</div>
                    )}
                  </SectionBlock>

                  <SectionBlock title="6 — Next Steps" borderColor="border-accent/60">
                    <div className="text-sm text-text-pri font-medium">
                      Reply to this proposal to confirm scope and we'll schedule a kickoff call.
                    </div>
                    {selected.sent_at && (
                      <div className="text-xxs font-mono text-text-mut mt-1">
                        Sent: {new Date(selected.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}
                  </SectionBlock>

                  {/* Full markdown collapsible */}
                  {selected.full_proposal_md && (
                    <details className="border border-bdr rounded-lg">
                      <summary className="px-4 py-2.5 text-xxs font-mono text-text-mut cursor-pointer hover:text-text-sec">
                        Full proposal markdown (copy-ready)
                      </summary>
                      <pre className="px-4 pb-4 text-xxs text-text-sec font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto">
                        {selected.full_proposal_md}
                      </pre>
                    </details>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

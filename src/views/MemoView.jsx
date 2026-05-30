import { useEffect, useState, useRef, useCallback } from 'react'
import {
  FileText, Loader2, AlertCircle, CheckCircle,
  Copy, Calendar, RefreshCw, X, Mic,
  TrendingUp, ChevronRight, Shield, Clock,
  ArrowRight, Check,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  analyzeMeeting, saveMeetingIntel, approveFollowUp,
  approveCrmUpdate, fetchMeetingIntel, updateFollowUp,
} from '../lib/memo'

// ─── Stage label map ────────────────────────────────────────────────────────────
const STAGE_COLORS = {
  Radar:     'text-text-mut   bg-bg-s2',
  Connected: 'text-info       bg-info-light',
  Engaged:   'text-accent     bg-accent-light',
  Discovery: 'text-warn       bg-warn-light',
  Proposal:  'text-ok         bg-ok-light',
}

const CONFIDENCE_COLORS = {
  HIGH:   'text-ok   bg-ok-light',
  MEDIUM: 'text-warn bg-warn-light',
  LOW:    'text-danger bg-danger-light',
}

const HS_STAGES = {
  appointmentscheduled:  'Radar',
  qualifiedtobuy:        'Connected',
  presentationscheduled: 'Engaged',
  decisionmakerboughtin: 'Discovery',
  contractsent:          'Proposal',
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function StageBadge({ stage }) {
  const cls = STAGE_COLORS[stage] || 'text-text-mut bg-bg-s2'
  return (
    <span className={`text-xxs font-mono px-1.5 py-0.5 rounded font-medium ${cls}`}>
      {stage || '—'}
    </span>
  )
}

function ConfBadge({ conf }) {
  const cls = CONFIDENCE_COLORS[conf] || 'text-text-mut bg-bg-s2'
  return (
    <span className={`text-xxs font-mono px-1.5 py-0.5 rounded font-medium ${cls}`}>
      {conf || 'MED'}
    </span>
  )
}

function StepItem({ step }) {
  const icon = {
    running: <Loader2 size={11} className="animate-spin text-gtm-orange shrink-0" />,
    done:    <CheckCircle size={11} className="text-ok shrink-0" />,
    error:   <AlertCircle size={11} className="text-danger shrink-0" />,
    pending: <div className="w-2.5 h-2.5 rounded-full border border-bdr shrink-0" />,
  }[step.status] ?? <div className="w-2.5 h-2.5 rounded-full border border-bdr shrink-0" />

  const color = {
    running: 'text-text-pri', done: 'text-ok',
    error: 'text-danger', pending: 'text-text-mut',
  }[step.status] ?? 'text-text-mut'

  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      {icon}
      <span className={color}>{step.label}</span>
    </div>
  )
}

// Left panel meeting row
function MeetingRow({ meeting, isSelected, onClick }) {
  const date = meeting.meeting_date
    ? new Date(meeting.meeting_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—'
  const status = meeting.crm_update_approved ? 'Approved' : meeting.followup_approved ? 'Follow-up ✓' : 'Extracted'
  const statusColor = meeting.crm_update_approved ? 'text-ok' : meeting.followup_approved ? 'text-info' : 'text-text-mut'

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-bdr/40 transition-colors border-l-2 ${
        isSelected ? 'bg-bg-s2 border-l-gtm-orange' : 'hover:bg-bg-s2/60 border-l-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-text-pri truncate">{meeting.company_name || 'Unknown'}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xxs text-text-mut font-mono">{date}</span>
            <StageBadge stage={meeting.deal_stage_recommendation} />
            <ConfBadge conf={meeting.confidence} />
          </div>
        </div>
        <span className={`text-xxs font-mono shrink-0 ${statusColor}`}>{status}</span>
      </div>
    </button>
  )
}

// Color-coded intel section
function IntelSection({ title, items = [], borderColor, emptyText }) {
  if (!items.length) {
    return (
      <div className={`border-l-2 ${borderColor} pl-3 py-2`}>
        <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-1">{title}</div>
        <div className="text-xs text-text-mut italic">{emptyText}</div>
      </div>
    )
  }
  return (
    <div className={`border-l-2 ${borderColor} pl-3`}>
      <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-2">{title}</div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-text-pri flex items-start gap-1.5">
            <span className="text-text-mut mt-0.5 shrink-0">▸</span>
            <span className="leading-snug">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Two-column commitments section
function CommitmentsSection({ bySameer = [], byProspect = [] }) {
  return (
    <div className="border-l-2 border-gtm-orange pl-3">
      <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-2">Commitments</div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xxs font-mono text-gtm-orange mb-1.5">Sameer's</div>
          {bySameer.length ? (
            <ul className="space-y-1">
              {bySameer.map((c, i) => <li key={i} className="text-sm text-text-pri flex gap-1.5"><span className="text-text-mut shrink-0">▸</span><span className="leading-snug">{c}</span></li>)}
            </ul>
          ) : <div className="text-xs text-text-mut italic">None recorded</div>}
        </div>
        <div>
          <div className="text-xxs font-mono text-text-sec mb-1.5">Prospect's</div>
          {byProspect.length ? (
            <ul className="space-y-1">
              {byProspect.map((c, i) => <li key={i} className="text-sm text-text-pri flex gap-1.5"><span className="text-text-mut shrink-0">▸</span><span className="leading-snug">{c}</span></li>)}
            </ul>
          ) : <div className="text-xs text-text-mut italic">None recorded</div>}
        </div>
      </div>
    </div>
  )
}

// ─── Main view ──────────────────────────────────────────────────────────────────

export default function MemoView() {
  // ── Data ──
  const [meetings, setMeetings]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const [selected, setSelected]       = useState(null)
  const [deals, setDeals]             = useState([])

  // ── Form ──
  const [showForm, setShowForm]       = useState(false)
  const [notes, setNotes]             = useState('')
  const [companyName, setCompanyName] = useState('')
  const [dealId, setDealId]           = useState('')
  const [contactNamesRaw, setContactNamesRaw] = useState('')
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10))

  // ── Processing ──
  const [steps, setSteps]             = useState([])
  const [processing, setProcessing]   = useState(false)
  const [procError, setProcError]     = useState(null)
  const abortRef = useRef(null)

  // ── Results actions ──
  const [copied, setCopied]           = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody]       = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [approvingFU, setApprovingFU] = useState(false)
  const [approvingCRM, setApprovingCRM] = useState(false)

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadMeetings = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true)
    try {
      const data = await fetchMeetingIntel()
      setMeetings(data)
      if (selected) {
        const updated = data.find(m => m.id === selected.id)
        if (updated) setSelected(updated)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [selected])

  useEffect(() => { loadMeetings() }, [])

  useEffect(() => {
    supabase
      .from('pipeline_snapshot')
      .select('deal_id,deal_name,company_name,company_domain')
      .order('amount', { ascending: false })
      .then(({ data }) => setDeals(data || []))
  }, [])

  // ── Process meeting ─────────────────────────────────────────────────────────
  const handleProcess = async () => {
    if (!notes.trim() || processing) return
    setSteps([])
    setProcError(null)
    setProcessing(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const contactNames = contactNamesRaw
        .split(',').map(s => s.trim()).filter(Boolean)

      const params = { transcript: notes, companyName, contactNames, meetingDate, dealId }
      const { intel, crmDraft } = await analyzeMeeting(params, setSteps, controller.signal)
      const id = await saveMeetingIntel(params, intel, crmDraft)

      const freshData = await fetchMeetingIntel()
      setMeetings(freshData)
      const newMeeting = freshData.find(m => m.id === id)
      if (newMeeting) setSelected(newMeeting)
      setShowForm(false)
    } catch (e) {
      if (e.name !== 'AbortError') setProcError(e.message || 'Processing failed')
    } finally {
      setProcessing(false)
      abortRef.current = null
    }
  }

  // ── Email actions ───────────────────────────────────────────────────────────
  const handleCopy = () => {
    if (!selected) return
    const text = `Subject: ${selected.followup_subject}\n\n${selected.followup_body}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const startEditEmail = () => {
    setEditSubject(selected?.followup_subject || '')
    setEditBody(selected?.followup_body || '')
    setEditingEmail(true)
  }

  const handleSaveEmail = async () => {
    if (!selected) return
    setSavingEmail(true)
    try {
      await updateFollowUp(selected.id, editSubject, editBody)
      setEditingEmail(false)
      await loadMeetings(true)
    } catch (e) { console.error(e) }
    finally { setSavingEmail(false) }
  }

  const handleApproveFollowUp = async () => {
    if (!selected || approvingFU) return
    setApprovingFU(true)
    try {
      await approveFollowUp(selected.id)
      await loadMeetings(true)
    } catch (e) { console.error(e) }
    finally { setApprovingFU(false) }
  }

  const handleApproveCRM = async () => {
    if (!selected || approvingCRM) return
    setApprovingCRM(true)
    try {
      await approveCrmUpdate(selected.id)
      await loadMeetings(true)
    } catch (e) { console.error(e) }
    finally { setApprovingCRM(false) }
  }

  const handleSelect = (m) => {
    setSelected(m)
    setEditingEmail(false)
    setCopied(false)
    setShowForm(false)
  }

  const openForm = () => {
    setShowForm(true)
    setSelected(null)
    setSteps([])
    setProcError(null)
    setNotes('')
    setCompanyName('')
    setDealId('')
    setContactNamesRaw('')
    setMeetingDate(new Date().toISOString().slice(0, 10))
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-bdr shrink-0">
        <Mic size={14} className="text-gtm-orange" />
        <span className="font-display text-lg tracking-wide">MEMO</span>
        <span className="text-text-mut text-xs font-mono">— Meeting Intelligence</span>
        <div className="flex-1" />
        <button
          onClick={() => loadMeetings(true)}
          disabled={refreshing}
          className="btn-ghost text-xs border border-bdr flex items-center gap-1.5"
        >
          <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
        <button onClick={openForm} className="btn-orange text-xs flex items-center gap-1.5">
          <FileText size={11} />
          + Process Meeting
        </button>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Past meetings (40%) ── */}
        <div className="w-[40%] shrink-0 border-r border-bdr flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-bdr/40 bg-bg-s2 shrink-0">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-xxs font-mono text-text-mut uppercase tracking-wider">
              <span>Company</span>
              <span>Date</span>
              <span>Stage</span>
              <span>Conf</span>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 space-y-px pt-px">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-bdr/30 animate-pulse space-y-1.5">
                  <div className="h-3 bg-bg-s2 rounded w-3/4" />
                  <div className="h-2 bg-bg-s2 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
              <FileText size={20} className="text-text-mut" />
              <div>
                <div className="text-sm text-text-sec font-medium">No meetings processed yet.</div>
                <div className="text-xs text-text-mut mt-1 leading-relaxed">
                  Paste notes after your first call.
                </div>
              </div>
              <button onClick={openForm} className="btn-orange text-xs flex items-center gap-1.5 mt-1">
                <FileText size={11} /> Process First Meeting
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {meetings.map(m => (
                <MeetingRow
                  key={m.id}
                  meeting={m}
                  isSelected={selected?.id === m.id}
                  onClick={() => handleSelect(m)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Form or Results (60%) ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── Processing form ── */}
          {showForm && (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="max-w-2xl space-y-4">

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={13} className="text-gtm-orange" />
                    <span className="font-mono text-xs text-text-pri uppercase tracking-widest">Process Meeting</span>
                  </div>
                  <button onClick={() => setShowForm(false)} className="text-text-mut hover:text-text-pri">
                    <X size={14} />
                  </button>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xxs font-mono text-text-mut uppercase tracking-wider mb-1">Company</label>
                    <select
                      value={dealId}
                      onChange={e => {
                        setDealId(e.target.value)
                        const deal = deals.find(d => d.deal_id === e.target.value)
                        if (deal) setCompanyName(deal.company_name || deal.deal_name?.split(/[—–-]/)[0]?.trim() || '')
                      }}
                      className="input-base w-full text-sm py-2"
                    >
                      <option value="">— Select from pipeline —</option>
                      {deals.map(d => (
                        <option key={d.deal_id} value={d.deal_id}>
                          {d.company_name || d.deal_name}
                        </option>
                      ))}
                    </select>
                    {!dealId && (
                      <input
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        placeholder="Or type company name…"
                        className="input-base w-full text-sm py-1.5 mt-1.5"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xxs font-mono text-text-mut uppercase tracking-wider mb-1">Contact names (comma-sep)</label>
                    <input
                      value={contactNamesRaw}
                      onChange={e => setContactNamesRaw(e.target.value)}
                      placeholder="e.g. Marcus Chen, Jana Smith"
                      className="input-base w-full text-sm py-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xxs font-mono text-text-mut uppercase tracking-wider mb-1">
                      <Calendar size={9} className="inline mr-1" />Meeting date
                    </label>
                    <input
                      type="date"
                      value={meetingDate}
                      onChange={e => setMeetingDate(e.target.value)}
                      className="input-base text-sm py-2"
                    />
                  </div>
                </div>

                {/* Notes textarea */}
                <div>
                  <label className="block text-xxs font-mono text-text-mut uppercase tracking-wider mb-1">
                    Meeting notes or transcript *
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={14}
                    placeholder="Paste meeting notes or transcript here…"
                    className="input-base w-full text-sm leading-relaxed py-3 resize-none font-mono"
                  />
                  <div className="text-right text-xxs font-mono text-text-mut mt-0.5">
                    {notes.trim().split(/\s+/).filter(Boolean).length} words
                  </div>
                </div>

                {/* Processing state */}
                {processing && steps.length > 0 && (
                  <div className="bg-bg-s2 border border-bdr rounded-lg p-4 space-y-2">
                    <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-3">
                      Memo is extracting intelligence…
                    </div>
                    {steps.map(s => <StepItem key={s.id} step={s} />)}
                  </div>
                )}

                {/* Error */}
                {procError && (
                  <div className="flex items-start gap-2 p-3 bg-danger/5 border border-danger/20 rounded-lg">
                    <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-danger font-medium">Processing failed</div>
                      <div className="text-xs text-danger/80 mt-0.5 whitespace-pre-wrap">{procError}</div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 justify-end">
                  <button onClick={() => setShowForm(false)} className="btn-ghost text-xs border border-bdr">
                    Cancel
                  </button>
                  <button
                    onClick={handleProcess}
                    disabled={processing || !notes.trim() || (!companyName.trim() && !dealId)}
                    className="btn-orange text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing
                      ? <><Loader2 size={11} className="animate-spin" /> Processing…</>
                      : <><Mic size={11} /> Process Meeting</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Results: selected meeting ── */}
          {!showForm && selected && (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Header */}
              <div className="shrink-0 border-b border-bdr px-5 py-4 bg-bg-s1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-display text-xl tracking-wide text-text-pri">
                        {selected.company_name || 'Unknown Company'}
                      </span>
                      <StageBadge stage={selected.deal_stage_recommendation} />
                      <ConfBadge conf={selected.confidence} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xxs text-text-mut font-mono">
                      {selected.contact_names?.length > 0 && (
                        <span>{selected.contact_names.join(', ')}</span>
                      )}
                      {selected.meeting_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={9} />
                          {new Date(selected.meeting_date + 'T12:00:00').toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-xxs font-mono text-text-mut">
                    {selected.crm_update_approved && <span className="text-ok flex items-center gap-1"><Check size={9} />CRM ✓</span>}
                    {selected.followup_approved && <span className="text-info flex items-center gap-1"><Check size={9} />FU ✓</span>}
                  </div>
                </div>
                {/* Quick stats */}
                <div className="flex gap-3 mt-2 text-xxs font-mono flex-wrap">
                  <span className="text-ok">{selected.buying_signals?.length || 0} signals</span>
                  <span className="text-danger">{selected.objections_raised?.length || 0} objections</span>
                  <span className="text-gtm-orange">{(selected.commitments_by_sameer?.length || 0) + (selected.commitments_by_prospect?.length || 0)} commitments</span>
                  <span className="text-info">{selected.next_steps?.length || 0} next steps</span>
                </div>
              </div>

              {/* Scrollable intel body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">

                {/* Buying signals — green */}
                <IntelSection
                  title="Buying Signals"
                  items={selected.buying_signals}
                  borderColor="border-ok"
                  emptyText="No buying signals detected."
                />

                {/* Objections — red */}
                <IntelSection
                  title="Objections Raised"
                  items={selected.objections_raised}
                  borderColor="border-danger"
                  emptyText="No objections raised."
                />

                {/* Pain points — amber */}
                <IntelSection
                  title="Pain Points Confirmed"
                  items={selected.pain_points_confirmed}
                  borderColor="border-warn"
                  emptyText="No pain points recorded."
                />

                {/* Commitments — orange, two columns */}
                <CommitmentsSection
                  bySameer={selected.commitments_by_sameer}
                  byProspect={selected.commitments_by_prospect}
                />

                {/* Next steps — blue, numbered */}
                <div className="border-l-2 border-info pl-3">
                  <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-2">Next Steps</div>
                  {selected.next_steps?.length ? (
                    <ol className="space-y-1.5">
                      {selected.next_steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-text-pri">
                          <span className="w-4 h-4 rounded-full bg-info-light border border-info/20 flex items-center justify-center shrink-0 mt-0.5 text-xxs font-mono text-info">{i + 1}</span>
                          <span className="leading-snug">{step}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="text-xs text-text-mut italic">No next steps recorded.</div>
                  )}
                </div>

                {/* Follow-up email */}
                <div className="border border-bdr rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-bg-s2 border-b border-bdr">
                    <span className="text-xxs font-mono text-text-mut uppercase tracking-widest">Follow-up Email</span>
                    <div className="flex items-center gap-2">
                      {!editingEmail && !selected.followup_approved && (
                        <button onClick={startEditEmail} className="text-xxs font-mono text-text-mut hover:text-gtm-orange flex items-center gap-1">
                          ✏️ Edit
                        </button>
                      )}
                      <button onClick={handleCopy} className="text-xxs font-mono border border-bdr rounded px-2 py-0.5 hover:border-gtm-orange/40 hover:text-gtm-orange transition-colors flex items-center gap-1">
                        {copied ? <><CheckCircle size={9} className="text-ok" /> Copied</> : <><Copy size={9} /> Copy Email</>}
                      </button>
                    </div>
                  </div>

                  {editingEmail ? (
                    <div className="p-4 space-y-3">
                      <div>
                        <label className="block text-xxs font-mono text-text-mut mb-1">Subject</label>
                        <input value={editSubject} onChange={e => setEditSubject(e.target.value)} className="input-base w-full text-sm py-2" />
                      </div>
                      <div>
                        <label className="block text-xxs font-mono text-text-mut mb-1">Body</label>
                        <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={8} className="input-base w-full text-sm py-2 resize-none" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingEmail(false)} className="btn-ghost text-xs border border-bdr">Cancel</button>
                        <button onClick={handleSaveEmail} disabled={savingEmail} className="btn-primary text-xs flex items-center gap-1.5">
                          {savingEmail ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />} Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="text-xs text-text-mut font-mono mb-2">Subject: <span className="text-text-pri font-medium">{selected.followup_subject}</span></div>
                      <div className="text-sm text-text-sec leading-relaxed whitespace-pre-wrap">{selected.followup_body}</div>
                    </div>
                  )}

                  <div className="px-4 py-2.5 border-t border-bdr bg-bg-s2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xxs font-mono text-text-mut">
                      <Shield size={9} />
                      Human gate — send manually after review
                    </div>
                    {!selected.followup_approved ? (
                      <button
                        onClick={handleApproveFollowUp}
                        disabled={approvingFU}
                        className="btn-primary text-xxs flex items-center gap-1 py-1 px-2"
                      >
                        {approvingFU ? <Loader2 size={9} className="animate-spin" /> : <CheckCircle size={9} />}
                        ✅ Mark Reviewed
                      </button>
                    ) : (
                      <span className="text-xxs font-mono text-ok flex items-center gap-1"><Check size={9} />Reviewed</span>
                    )}
                  </div>
                </div>

                {/* CRM update draft */}
                <div className="border border-bdr rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-bg-s2 border-b border-bdr">
                    <span className="text-xxs font-mono text-text-mut uppercase tracking-widest">CRM Update Draft</span>
                    <StageBadge stage={selected.deal_stage_recommendation} />
                  </div>
                  {selected.crm_update_draft ? (
                    <div className="p-4 space-y-2">
                      {Object.entries(selected.crm_update_draft).map(([k, v]) => (
                        <div key={k} className="flex items-start gap-2 text-xs">
                          <span className="font-mono text-text-mut w-32 shrink-0">{k}</span>
                          <span className="text-text-pri">
                            {k === 'dealstage' ? (HS_STAGES[v] || v) : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-xs text-text-mut italic">No CRM draft generated.</div>
                  )}
                  <div className="px-4 py-2.5 border-t border-bdr bg-bg-s2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xxs font-mono text-text-mut">
                      <Shield size={9} />
                      HubSpot push is Phase 2 — approve to record intent
                    </div>
                    {!selected.crm_update_approved ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleApproveCRM}
                          disabled={approvingCRM}
                          className="btn-primary text-xxs flex items-center gap-1 py-1 px-2"
                        >
                          {approvingCRM ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
                          ✅ Approve CRM Update
                        </button>
                        <button
                          onClick={() => setSelected(prev => ({ ...prev, crm_update_approved: false }))}
                          className="text-xxs font-mono text-text-mut hover:text-text-sec px-2 py-1 border border-bdr rounded"
                        >
                          ❌ Skip
                        </button>
                      </div>
                    ) : (
                      <span className="text-xxs font-mono text-ok flex items-center gap-1"><Check size={9} />Approved</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Empty state ── */}
          {!showForm && !selected && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-10 h-10 rounded-full bg-bg-s2 border border-bdr flex items-center justify-center">
                <Mic size={18} className="text-text-mut" />
              </div>
              <div>
                <div className="text-sm text-text-sec font-medium">Select a meeting or process new notes</div>
                <div className="text-xs text-text-mut mt-1 max-w-xs leading-relaxed">
                  Paste meeting notes → Memo extracts buying signals, objections, commitments, next steps, and drafts the follow-up.
                </div>
              </div>
              <button onClick={openForm} className="btn-orange text-xs flex items-center gap-1.5 mt-1">
                <FileText size={11} /> Process Meeting
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

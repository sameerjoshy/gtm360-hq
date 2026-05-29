import { useEffect, useState, useRef, useCallback } from 'react'
import {
  FileText, Loader2, AlertCircle, CheckCircle,
  Copy, ChevronRight, Calendar, User, Building2,
  Mail, BarChart2, ArrowRight, Zap, RefreshCw,
  TrendingUp, Shield, Clock, MessageSquare, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { analyzeMeeting, saveMeetingNote, approveMeetingNote, fetchMeetingNotes, updateFollowUp } from '../lib/memo'

// ─── Constants ─────────────────────────────────────────────────────────────────

const MEETING_TYPES = [
  { value: 'discovery',  label: 'Discovery' },
  { value: 'check_in',   label: 'Check-in'  },
  { value: 'proposal',   label: 'Proposal'  },
  { value: 'demo',       label: 'Demo'      },
  { value: 'other',      label: 'Other'     },
]

const STRENGTH_CONFIG = {
  HIGH:   { color: 'text-ok',          bg: 'bg-ok-light',      label: 'HIGH'   },
  MEDIUM: { color: 'text-warn',        bg: 'bg-warn-light',    label: 'MED'    },
  LOW:    { color: 'text-text-mut',    bg: 'bg-bg-s2',         label: 'LOW'    },
}

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     color: 'text-text-mut',   icon: Clock       },
  extracted: { label: 'Extracted', color: 'text-info',       icon: Zap         },
  approved:  { label: 'Approved',  color: 'text-ok',         icon: CheckCircle },
  archived:  { label: 'Archived',  color: 'text-text-mut',   icon: FileText    },
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StepItem({ step }) {
  const iconMap = {
    running: <Loader2 size={11} className="animate-spin text-gtm-orange shrink-0" />,
    done:    <CheckCircle size={11} className="text-ok shrink-0" />,
    error:   <AlertCircle size={11} className="text-danger shrink-0" />,
    pending: <div className="w-2.5 h-2.5 rounded-full border border-bdr shrink-0" />,
  }
  const colorMap = {
    running: 'text-text-pri', done: 'text-ok', error: 'text-danger', pending: 'text-text-mut',
  }
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      {iconMap[step.status] ?? iconMap.pending}
      <span className={colorMap[step.status] ?? 'text-text-mut'}>{step.label}</span>
    </div>
  )
}

function SectionHeader({ label }) {
  return (
    <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-2 pt-1">{label}</div>
  )
}

function SignalStrength({ strength }) {
  const cfg = STRENGTH_CONFIG[strength] || STRENGTH_CONFIG.LOW
  return (
    <span className={`text-xxs font-mono px-1.5 py-0.5 rounded ${cfg.color} ${cfg.bg}`}>
      {cfg.label}
    </span>
  )
}

function NoteRow({ note, isSelected, onClick }) {
  const statusCfg = STATUS_CONFIG[note.status] || STATUS_CONFIG.extracted
  const StatusIcon = statusCfg.icon
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-bdr/40 transition-colors border-l-2 ${
        isSelected ? 'bg-bg-s2 border-l-gtm-orange' : 'hover:bg-bg-s2/60 border-l-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-text-pri truncate">{note.company_name}</div>
          <div className="text-xs text-text-mut font-mono mt-0.5">
            {note.contact_name || '—'} · {note.meeting_type}
          </div>
          {note.sam_brief_update && (
            <div className="text-xs text-text-sec mt-1 line-clamp-1 leading-snug">
              {note.sam_brief_update}
            </div>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className={`text-xxs font-mono flex items-center gap-1 ${statusCfg.color}`}>
            <StatusIcon size={9} />{statusCfg.label}
          </span>
          <span className="text-xxs text-text-mut font-mono">
            {new Date(note.meeting_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </button>
  )
}

// ─── Intel display panels ──────────────────────────────────────────────────────

function CommitmentsPanel({ items }) {
  if (!items?.length) return <div className="text-xs text-text-mut font-mono">No commitments recorded.</div>
  return (
    <div className="space-y-2">
      {items.map((c, i) => (
        <div key={i} className="border border-bdr rounded-lg px-3 py-2.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xxs font-mono text-gtm-orange font-bold">{c.who}</span>
            {c.by_when && <span className="text-xxs font-mono text-text-mut">{c.by_when}</span>}
          </div>
          <div className="text-xs text-text-pri mt-1 leading-snug">{c.what}</div>
        </div>
      ))}
    </div>
  )
}

function BuyingSignalsPanel({ items }) {
  if (!items?.length) return <div className="text-xs text-text-mut font-mono">No buying signals detected.</div>
  return (
    <div className="space-y-2">
      {items.map((s, i) => (
        <div key={i} className="border border-bdr rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <SignalStrength strength={s.strength} />
            <span className="text-xs font-medium text-text-pri">{s.signal}</span>
          </div>
          {s.quote && (
            <div className="text-xs text-text-mut italic font-mono leading-snug border-l-2 border-bdr pl-2">
              "{s.quote}"
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ObjectionsPanel({ items }) {
  if (!items?.length) return <div className="text-xs text-text-mut font-mono">No objections raised.</div>
  return (
    <div className="space-y-2">
      {items.map((o, i) => (
        <div key={i} className="border-l-2 border-warn/50 pl-3 py-1">
          <div className="text-xs font-medium text-warn leading-snug">{o.objection}</div>
          <div className="text-xs text-text-sec mt-1.5 leading-snug">
            <span className="text-xxs font-mono text-text-mut mr-1">→</span>{o.response_suggested}
          </div>
        </div>
      ))}
    </div>
  )
}

function NextStepsPanel({ items }) {
  if (!items?.length) return <div className="text-xs text-text-mut font-mono">No next steps recorded.</div>
  return (
    <div className="space-y-1.5">
      {items.map((n, i) => (
        <div key={i} className="flex items-start gap-2.5 text-xs">
          <div className="w-4 h-4 rounded-full bg-bg-s2 border border-bdr flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xxs font-mono text-text-mut">{i + 1}</span>
          </div>
          <div className="flex-1">
            <span className="text-text-pri">{n.action}</span>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xxs text-gtm-orange font-mono">{n.owner}</span>
              {n.due_date && <span className="text-xxs text-text-mut font-mono">{n.due_date}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main view ─────────────────────────────────────────────────────────────────

export default function MemoView() {
  // ── Notes list state ──
  const [notes, setNotes]           = useState([])
  const [notesLoading, setNotesLoading] = useState(true)
  const [selected, setSelected]     = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  // ── Input form state ──
  const [showForm, setShowForm]     = useState(false)
  const [transcript, setTranscript] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10))
  const [meetingType, setMeetingType] = useState('discovery')
  const [dealId, setDealId]         = useState('')
  const [deals, setDeals]           = useState([])

  // ── Extraction state ──
  const [steps, setSteps]           = useState([])
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState(null)
  const [currentIntel, setCurrentIntel] = useState(null)
  const [savedId, setSavedId]       = useState(null)
  const abortRef = useRef(null)

  // ── Detail panel tabs ──
  const [activeTab, setActiveTab]   = useState('intel') // intel | followup | crm
  const [copied, setCopied]         = useState(false)
  const [approving, setApproving]   = useState(false)
  const [approved, setApproved]     = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [editSubject, setEditSubject]   = useState('')
  const [editBody, setEditBody]         = useState('')
  const [savingEmail, setSavingEmail]   = useState(false)

  // ── Load notes + deals ──────────────────────────────────────────────────────
  const loadNotes = useCallback(async (quiet = false) => {
    if (!quiet) setNotesLoading(true)
    else setRefreshing(true)
    try {
      const data = await fetchMeetingNotes()
      setNotes(data)
      if (selected) {
        const updated = data.find(n => n.id === selected.id)
        if (updated) setSelected(updated)
      }
    } catch (e) { console.error(e) }
    finally { setNotesLoading(false); setRefreshing(false) }
  }, [selected])

  useEffect(() => { loadNotes() }, [])

  useEffect(() => {
    supabase.from('pipeline_snapshot').select('deal_id,deal_name,company_name,company_domain').order('amount', { ascending: false })
      .then(({ data }) => setDeals(data || []))
  }, [])

  // ── Extraction ──────────────────────────────────────────────────────────────
  const handleExtract = async () => {
    if (!transcript.trim() || !companyName.trim() || extracting) return
    setSteps([])
    setExtractError(null)
    setCurrentIntel(null)
    setSavedId(null)
    setExtracting(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const intel = await analyzeMeeting(
        { transcript, companyName, contactName, meetingDate, meetingType, dealId },
        setSteps,
        controller.signal
      )
      setCurrentIntel(intel)

      // Auto-save
      const id = await saveMeetingNote(
        { transcript, companyName, contactName, meetingDate, meetingType, dealId },
        intel
      )
      setSavedId(id)
      await loadNotes(true)
      // Select the new note
      const freshNotes = await fetchMeetingNotes()
      const newNote = freshNotes.find(n => n.id === id)
      if (newNote) setSelected(newNote)
      setShowForm(false)
    } catch (e) {
      if (e.name !== 'AbortError') setExtractError(e.message || 'Extraction failed')
    } finally {
      setExtracting(false)
      abortRef.current = null
    }
  }

  // ── Approve ─────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!selected || approving) return
    setApproving(true)
    try {
      await approveMeetingNote(selected.id)
      setApproved(true)
      await loadNotes(true)
    } catch (e) {
      console.error(e)
    } finally {
      setApproving(false)
    }
  }

  // ── Copy email ──────────────────────────────────────────────────────────────
  const handleCopy = () => {
    if (!selected) return
    const text = `Subject: ${selected.follow_up_email_subject}\n\n${selected.follow_up_email_body}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Save email edit ─────────────────────────────────────────────────────────
  const handleSaveEmail = async () => {
    if (!selected) return
    setSavingEmail(true)
    try {
      await updateFollowUp(selected.id, editSubject, editBody)
      setEditingEmail(false)
      await loadNotes(true)
    } catch (e) { console.error(e) }
    finally { setSavingEmail(false) }
  }

  const startEditEmail = () => {
    setEditSubject(selected?.follow_up_email_subject || '')
    setEditBody(selected?.follow_up_email_body || '')
    setEditingEmail(true)
  }

  // ── Select note ─────────────────────────────────────────────────────────────
  const handleSelect = (note) => {
    setSelected(note)
    setActiveTab('intel')
    setApproved(note.status === 'approved')
    setEditingEmail(false)
    setCopied(false)
  }

  const displayNote = selected

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-bdr shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-gtm-orange" />
          <span className="font-display text-lg tracking-wide">Memo</span>
          <span className="text-text-mut text-xs font-mono">— Meeting Intel</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => loadNotes(true)}
          disabled={refreshing}
          className="btn-ghost text-xs border border-bdr flex items-center gap-1.5"
        >
          <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
        <button
          onClick={() => { setShowForm(true); setCurrentIntel(null); setSavedId(null); setSteps([]); setExtractError(null) }}
          className="btn-orange text-xs flex items-center gap-1.5"
        >
          <Zap size={11} />
          New Analysis
        </button>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Notes list ── */}
        <div className="w-[320px] shrink-0 border-r border-bdr flex flex-col overflow-hidden">
          {notesLoading ? (
            <div className="flex-1 space-y-px pt-px">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-bdr/30 animate-pulse space-y-1.5">
                  <div className="h-3 bg-bg-s2 rounded w-3/4" />
                  <div className="h-2.5 bg-bg-s2 rounded w-1/2" />
                  <div className="h-2 bg-bg-s2 rounded w-full" />
                </div>
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
              <FileText size={20} className="text-text-mut" />
              <div>
                <div className="text-sm text-text-sec">No meeting notes yet</div>
                <div className="text-xs text-text-mut mt-1">Click <span className="font-mono text-gtm-orange">New Analysis</span> to analyze a call transcript.</div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {notes.map(note => (
                <NoteRow
                  key={note.id}
                  note={note}
                  isSelected={selected?.id === note.id}
                  onClick={() => handleSelect(note)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── New Analysis Form ── */}
          {showForm && (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="max-w-2xl space-y-4">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={13} className="text-gtm-orange" />
                    <span className="font-mono text-xs text-text-pri uppercase tracking-widest">New Analysis</span>
                  </div>
                  <button onClick={() => setShowForm(false)} className="text-text-mut hover:text-text-pri">
                    <X size={14} />
                  </button>
                </div>

                {/* Meeting metadata */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xxs font-mono text-text-mut uppercase tracking-wider mb-1">Company *</label>
                    <input
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      placeholder="e.g. revVana"
                      className="input-base w-full text-sm py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-mono text-text-mut uppercase tracking-wider mb-1">Contact</label>
                    <input
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                      placeholder="e.g. Marcus Chen"
                      className="input-base w-full text-sm py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-mono text-text-mut uppercase tracking-wider mb-1">Meeting Date</label>
                    <input
                      type="date"
                      value={meetingDate}
                      onChange={e => setMeetingDate(e.target.value)}
                      className="input-base w-full text-sm py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xxs font-mono text-text-mut uppercase tracking-wider mb-1">Type</label>
                    <select value={meetingType} onChange={e => setMeetingType(e.target.value)} className="input-base w-full text-sm py-2">
                      {MEETING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xxs font-mono text-text-mut uppercase tracking-wider mb-1">Deal (optional)</label>
                    <select value={dealId} onChange={e => setDealId(e.target.value)} className="input-base w-full text-sm py-2">
                      <option value="">— Select deal —</option>
                      {deals.map(d => (
                        <option key={d.deal_id} value={d.deal_id}>
                          {d.company_name || d.deal_name} {d.company_domain ? `(${d.company_domain})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Transcript */}
                <div>
                  <label className="block text-xxs font-mono text-text-mut uppercase tracking-wider mb-1">
                    Transcript / Call Notes *
                  </label>
                  <textarea
                    value={transcript}
                    onChange={e => setTranscript(e.target.value)}
                    rows={14}
                    placeholder="Paste your call transcript, meeting notes, or key discussion points here…"
                    className="input-base w-full text-sm leading-relaxed py-3 resize-none font-mono"
                  />
                  <div className="text-right text-xxs font-mono text-text-mut mt-0.5">
                    {transcript.split(/\s+/).filter(Boolean).length} words
                  </div>
                </div>

                {/* Extract steps */}
                {steps.length > 0 && (
                  <div className="bg-bg-s2 border border-bdr rounded-lg p-3 space-y-1.5">
                    {steps.map(s => <StepItem key={s.id} step={s} />)}
                  </div>
                )}

                {/* Error */}
                {extractError && (
                  <div className="flex items-start gap-2 p-3 bg-danger/5 border border-danger/20 rounded-lg">
                    <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" />
                    <span className="text-xs text-danger">{extractError}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 justify-end">
                  <button onClick={() => setShowForm(false)} className="btn-ghost text-xs border border-bdr">
                    Cancel
                  </button>
                  <button
                    onClick={handleExtract}
                    disabled={extracting || !transcript.trim() || !companyName.trim()}
                    className="btn-orange text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {extracting
                      ? <><Loader2 size={11} className="animate-spin" /> Extracting…</>
                      : <><Zap size={11} /> Extract Intel</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Note detail ── */}
          {!showForm && displayNote && (
            <>
              {/* Header strip */}
              <div className="shrink-0 border-b border-bdr px-5 py-4 bg-bg-s1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-display text-xl text-text-pri tracking-wide leading-none">
                        {displayNote.company_name}
                      </span>
                      <span className={`text-xxs font-mono px-1.5 py-0.5 rounded ${STATUS_CONFIG[displayNote.status]?.color || 'text-text-mut'} bg-bg-s2`}>
                        {STATUS_CONFIG[displayNote.status]?.label || displayNote.status}
                      </span>
                      <span className="badge-muted text-xxs">{displayNote.meeting_type}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {displayNote.contact_name && (
                        <span className="flex items-center gap-1 text-xs text-text-mut font-mono">
                          <User size={9} />{displayNote.contact_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-text-mut font-mono">
                        <Calendar size={9} />
                        {new Date(displayNote.meeting_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    {displayNote.sam_brief_update && (
                      <div className="mt-1.5 text-xs text-text-sec leading-snug italic">
                        → {displayNote.sam_brief_update}
                      </div>
                    )}
                  </div>

                  {displayNote.deal_stage_recommended && (
                    <div className="shrink-0 text-right">
                      <div className="text-xxs font-mono text-text-mut uppercase tracking-wider">Stage rec.</div>
                      <div className="font-display text-lg text-gtm-orange leading-tight mt-0.5">
                        {displayNote.deal_stage_recommended}
                      </div>
                    </div>
                  )}
                </div>

                {/* Signal summary */}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-xxs font-mono text-text-mut">
                    {displayNote.commitments?.length || 0} commitments
                  </span>
                  <span className="text-xxs font-mono text-ok">
                    {displayNote.buying_signals?.length || 0} signals
                  </span>
                  <span className="text-xxs font-mono text-warn">
                    {displayNote.objections?.length || 0} objections
                  </span>
                  <span className="text-xxs font-mono text-text-sec">
                    {displayNote.next_steps?.length || 0} next steps
                  </span>
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex items-center border-b border-bdr shrink-0 px-5">
                {[
                  { id: 'intel',   label: '📋 Intel',    icon: BarChart2  },
                  { id: 'followup',label: '📧 Follow-up', icon: Mail       },
                  { id: 'crm',     label: '📊 CRM',       icon: TrendingUp },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 text-xs font-mono whitespace-nowrap transition-colors border-b-2 -mb-px ${
                      activeTab === tab.id
                        ? 'text-gtm-orange border-gtm-orange'
                        : 'text-text-mut border-transparent hover:text-text-sec'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* ── Intel tab ── */}
                {activeTab === 'intel' && (
                  <>
                    <div>
                      <SectionHeader label="Commitments" />
                      <CommitmentsPanel items={displayNote.commitments} />
                    </div>
                    <div>
                      <SectionHeader label="Buying Signals" />
                      <BuyingSignalsPanel items={displayNote.buying_signals} />
                    </div>
                    <div>
                      <SectionHeader label="Objections" />
                      <ObjectionsPanel items={displayNote.objections} />
                    </div>
                    <div>
                      <SectionHeader label="Next Steps" />
                      <NextStepsPanel items={displayNote.next_steps} />
                    </div>
                    {displayNote.stage_change_rationale && (
                      <div className="border border-bdr rounded-lg px-4 py-3 bg-accent-light/30">
                        <SectionHeader label="Stage Recommendation Rationale" />
                        <p className="text-xs text-text-sec leading-relaxed">{displayNote.stage_change_rationale}</p>
                      </div>
                    )}
                  </>
                )}

                {/* ── Follow-up tab ── */}
                {activeTab === 'followup' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <SectionHeader label="Follow-up Email Draft" />
                      <div className="flex items-center gap-2">
                        {!editingEmail && displayNote.status !== 'approved' && (
                          <button onClick={startEditEmail} className="text-xxs font-mono text-text-mut hover:text-text-pri flex items-center gap-1">
                            <FileText size={9} /> Edit
                          </button>
                        )}
                        <button onClick={handleCopy} className="flex items-center gap-1 text-xxs font-mono border border-bdr rounded px-2 py-0.5 hover:text-gtm-orange hover:border-gtm-orange/40 transition-colors">
                          {copied ? <><CheckCircle size={9} className="text-ok" /> Copied</> : <><Copy size={9} /> Copy</>}
                        </button>
                      </div>
                    </div>

                    {editingEmail ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xxs font-mono text-text-mut mb-1">Subject</label>
                          <input value={editSubject} onChange={e => setEditSubject(e.target.value)} className="input-base w-full text-sm py-2" />
                        </div>
                        <div>
                          <label className="block text-xxs font-mono text-text-mut mb-1">Body</label>
                          <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={10} className="input-base w-full text-sm py-2 leading-relaxed resize-none" />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingEmail(false)} className="btn-ghost text-xs border border-bdr">Cancel</button>
                          <button onClick={handleSaveEmail} disabled={savingEmail} className="btn-primary text-xs flex items-center gap-1.5">
                            {savingEmail ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-bdr rounded-lg overflow-hidden">
                        <div className="px-4 py-2.5 bg-bg-s2 border-b border-bdr">
                          <span className="text-xxs font-mono text-text-mut">Subject: </span>
                          <span className="text-xs font-medium text-text-pri">{displayNote.follow_up_email_subject}</span>
                        </div>
                        <div className="px-4 py-3 text-sm text-text-pri leading-relaxed whitespace-pre-wrap font-mono text-xs">
                          {displayNote.follow_up_email_body}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xxs font-mono text-text-mut">
                      <Shield size={9} />
                      Human gate — copy this email and send it yourself. Nothing auto-sends.
                    </div>
                  </div>
                )}

                {/* ── CRM tab ── */}
                {activeTab === 'crm' && (
                  <div className="space-y-5">
                    {displayNote.deal_stage_recommended && (
                      <div>
                        <SectionHeader label="Stage Recommendation" />
                        <div className="flex items-center gap-3 p-3 border border-bdr rounded-lg bg-accent-light/30">
                          <ArrowRight size={14} className="text-gtm-orange shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-text-pri">Move to: <span className="text-gtm-orange">{displayNote.deal_stage_recommended}</span></div>
                            {displayNote.stage_change_rationale && (
                              <div className="text-xs text-text-sec mt-0.5">{displayNote.stage_change_rationale}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {displayNote.crm_update_notes && (
                      <div>
                        <SectionHeader label="HubSpot Note (copy to CRM)" />
                        <div className="bg-bg-s2 border border-bdr rounded-lg px-4 py-3 text-xs text-text-sec leading-relaxed font-mono whitespace-pre-wrap">
                          {displayNote.crm_update_notes}
                        </div>
                      </div>
                    )}

                    {displayNote.sam_brief_update && (
                      <div>
                        <SectionHeader label="Sam Brief Update" />
                        <div className="bg-bg-s2 border border-bdr rounded-lg px-4 py-3 text-xs text-text-pri leading-relaxed italic">
                          "{displayNote.sam_brief_update}"
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xxs font-mono text-text-mut">
                      <Shield size={9} />
                      Human gate — update HubSpot manually after approval.
                    </div>
                  </div>
                )}
              </div>

              {/* ── Action bar ── */}
              {displayNote.status !== 'approved' && (
                <div className="shrink-0 border-t border-bdr px-5 py-3 bg-bg-s1 flex items-center gap-3">
                  <div className="text-xxs font-mono text-text-mut flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-warn inline-block" />
                    Review intel, follow-up, and CRM update before approving
                  </div>
                  <div className="flex-1" />
                  <button
                    onClick={handleApprove}
                    disabled={approving || approved}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                      approved
                        ? 'bg-ok-light text-ok border border-ok/20 cursor-default'
                        : 'btn-primary'
                    }`}
                  >
                    {approving
                      ? <Loader2 size={11} className="animate-spin" />
                      : <CheckCircle size={11} />}
                    {approved ? 'Approved' : '✅ Approve Note'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Empty state ── */}
          {!showForm && !displayNote && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-10 h-10 rounded-full bg-bg-s2 border border-bdr flex items-center justify-center">
                <FileText size={18} className="text-text-mut" />
              </div>
              <div>
                <div className="text-sm text-text-sec">Select a note or start a new analysis</div>
                <div className="text-xs text-text-mut mt-1">
                  Paste a call transcript → Memo extracts commitments, signals, objections, next steps + drafts the follow-up.
                </div>
              </div>
              <button onClick={() => setShowForm(true)} className="btn-orange text-xs flex items-center gap-1.5 mt-1">
                <Zap size={11} /> New Analysis
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

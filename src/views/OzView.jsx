import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Send, Loader2, AlertCircle, CheckCircle, SkipForward,
  Mail, Linkedin, Phone, MessageSquare, Edit3, Save,
  X, RefreshCw, ChevronRight, Calendar, User, Building2,
  Inbox, Clock, Check, Ban,
} from 'lucide-react'
import {
  fetchOutreachQueue, approveTouch, skipTouch, markSent,
  updateMessageBody, deleteCompanyDrafts,
} from '../lib/oz'

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  draft:    { label: 'Draft',    color: 'text-text-mut',    bg: 'bg-bg-s2',         icon: Clock },
  approved: { label: 'Approved', color: 'text-ok',          bg: 'bg-ok-light',      icon: Check },
  sent:     { label: 'Sent',     color: 'text-info',        bg: 'bg-info-light',    icon: Send },
  replied:  { label: 'Replied',  color: 'text-gtm-orange',  bg: 'bg-accent-light',  icon: MessageSquare },
  bounced:  { label: 'Bounced',  color: 'text-danger',      bg: 'bg-danger-light',  icon: Ban },
  skipped:  { label: 'Skipped',  color: 'text-text-mut',    bg: 'bg-bg-s2',         icon: SkipForward },
}

const CHANNEL_CONFIG = {
  linkedin_connection: { label: 'LinkedIn Connect', icon: Linkedin,      color: 'text-info'     },
  linkedin_dm:         { label: 'LinkedIn DM',      icon: Linkedin,      color: 'text-info'     },
  email:               { label: 'Email',             icon: Mail,          color: 'text-gtm-orange' },
  linkedin_comment:    { label: 'LinkedIn Comment',  icon: Linkedin,      color: 'text-text-sec' },
  phone:               { label: 'Phone',             icon: Phone,         color: 'text-ok'       },
  other:               { label: 'Other',             icon: MessageSquare, color: 'text-text-mut' },
}

const STATUS_TABS = ['All', 'Draft', 'Approved', 'Sent', 'Replied', 'Skipped']

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xxs font-mono px-1.5 py-0.5 rounded ${cfg.color} ${cfg.bg}`}>
      <Icon size={9} />
      {cfg.label}
    </span>
  )
}

function ChannelBadge({ channel }) {
  const cfg = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.other
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xxs font-mono ${cfg.color}`}>
      <Icon size={9} />
      {cfg.label}
    </span>
  )
}

function TouchRow({ touch, isSelected, onClick }) {
  const statusCfg = STATUS_CONFIG[touch.status] || STATUS_CONFIG.draft
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3 border-b border-bdr/40 transition-colors
        border-l-2 flex items-start gap-3
        ${isSelected
          ? 'bg-bg-s2 border-l-gtm-orange'
          : 'hover:bg-bg-s2/60 border-l-transparent'}
      `}
    >
      {/* Touch number */}
      <div className="w-5 h-5 rounded-full bg-bg-s2 border border-bdr flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-xxs font-mono text-text-mut">{touch.sequence_number}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className="text-sm font-medium text-text-pri truncate">{touch.company_name}</span>
          <ChannelBadge channel={touch.channel} />
        </div>
        <div className="text-xs text-text-mut font-mono truncate">
          {touch.contact_name || '—'}
          {touch.scheduled_for
            ? ` · ${new Date(touch.scheduled_for + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : ''}
        </div>
        <div className="text-xs text-text-sec mt-1 line-clamp-1 leading-snug">
          {touch.message_body}
        </div>
      </div>

      <StatusBadge status={touch.status} />
    </button>
  )
}

function EmptyState({ tab }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
      <div className="w-10 h-10 rounded-full bg-bg-s2 border border-bdr flex items-center justify-center">
        <Inbox size={18} className="text-text-mut" />
      </div>
      <div>
        <div className="text-sm text-text-sec">
          {tab === 'All' ? 'No outreach touches yet' : `No ${tab.toLowerCase()} touches`}
        </div>
        <div className="text-xs text-text-mut mt-1">
          Run <span className="font-mono text-gtm-orange">⚡ Intel</span> on a Rex deal, then click{' '}
          <span className="font-mono text-info">📤 Create Outreach</span> to generate a sequence.
        </div>
      </div>
    </div>
  )
}

// ─── Main view ─────────────────────────────────────────────────────────────────

export default function OzView() {
  const [queue, setQueue]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected]     = useState(null)
  const [tabFilter, setTabFilter]   = useState('All')
  const [actionLoading, setActionLoading] = useState(null) // 'approve' | 'skip' | 'send'
  const [actionError, setActionError]     = useState(null)
  const [editing, setEditing]       = useState(false)
  const [editBody, setEditBody]     = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [saving, setSaving]         = useState(false)
  const bodyRef = useRef(null)

  // ── Load queue ──────────────────────────────────────────────────────────────
  const loadQueue = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    else setRefreshing(true)
    try {
      const data = await fetchOutreachQueue()
      setQueue(data)
      // Keep selected in sync if it was updated
      if (selected) {
        const updated = data.find(t => t.id === selected.id)
        if (updated) setSelected(updated)
      }
    } catch (e) {
      console.error('OzView load error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selected])

  useEffect(() => { loadQueue() }, [])

  // ── Derived data ────────────────────────────────────────────────────────────
  const filtered = queue.filter(t =>
    tabFilter === 'All' || t.status === tabFilter.toLowerCase()
  )

  const counts = {
    All:      queue.length,
    Draft:    queue.filter(t => t.status === 'draft').length,
    Approved: queue.filter(t => t.status === 'approved').length,
    Sent:     queue.filter(t => t.status === 'sent').length,
    Replied:  queue.filter(t => t.status === 'replied').length,
    Skipped:  queue.filter(t => t.status === 'skipped').length,
  }

  // ── Editing helpers ─────────────────────────────────────────────────────────
  const startEdit = () => {
    if (!selected) return
    setEditBody(selected.message_body || '')
    setEditSubject(selected.subject || '')
    setEditing(true)
    setTimeout(() => bodyRef.current?.focus(), 50)
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditBody('')
    setEditSubject('')
  }

  const handleSaveEdit = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await updateMessageBody(selected.id, editBody, editSubject)
      setEditing(false)
      await loadQueue(true)
    } catch (e) {
      setActionError(`Save failed: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ── Action handlers ─────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!selected || actionLoading) return
    setActionLoading('approve')
    setActionError(null)
    try {
      await approveTouch(selected.id)
      await loadQueue(true)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSkip = async () => {
    if (!selected || actionLoading) return
    setActionLoading('skip')
    setActionError(null)
    try {
      await skipTouch(selected.id)
      await loadQueue(true)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSend = async () => {
    if (!selected || actionLoading) return
    if (selected.status !== 'approved') {
      setActionError('Approve this touch before sending.')
      return
    }
    setActionLoading('send')
    setActionError(null)
    try {
      await markSent(selected.id)
      await loadQueue(true)
    } catch (e) {
      setActionError(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSelect = (touch) => {
    setSelected(touch)
    cancelEdit()
    setActionError(null)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const isActionable = selected && !actionLoading && !editing
  const canSend      = isActionable && selected.status === 'approved'

  return (
    <div className="h-[calc(100vh-48px)] flex flex-col overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-bdr shrink-0">
        <div className="flex items-center gap-2">
          <Send size={14} className="text-gtm-orange" />
          <span className="font-display text-lg tracking-wide">Oz</span>
          <span className="text-text-mut text-xs font-mono">— Outreach</span>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => loadQueue(true)}
          disabled={refreshing}
          className="btn-ghost text-xs border border-bdr flex items-center gap-1.5"
          title="Refresh queue"
        >
          <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Tab filter bar ── */}
      <div className="flex items-center gap-0 px-5 py-0 border-b border-bdr shrink-0 overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setTabFilter(tab)}
            className={`
              px-4 py-2.5 text-xs font-mono whitespace-nowrap transition-colors border-b-2 -mb-px
              ${tabFilter === tab
                ? 'text-gtm-orange border-gtm-orange'
                : 'text-text-mut border-transparent hover:text-text-sec'}
            `}
          >
            {tab}
            {counts[tab] > 0 && (
              <span className={`ml-1.5 text-xxs px-1 py-0.5 rounded ${
                tabFilter === tab ? 'bg-accent-light text-gtm-orange' : 'bg-bg-s2 text-text-mut'
              }`}>
                {counts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Queue list ── */}
        <div className="w-[380px] shrink-0 border-r border-bdr flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex-1 space-y-px pt-px">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-3 px-4 py-3 animate-pulse border-b border-bdr/30">
                  <div className="w-5 h-5 rounded-full bg-bg-s2 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-bg-s2 rounded w-3/4" />
                    <div className="h-2.5 bg-bg-s2 rounded w-1/2" />
                    <div className="h-2 bg-bg-s2 rounded w-full" />
                  </div>
                  <div className="h-4 w-14 bg-bg-s2 rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState tab={tabFilter} />
          ) : (
            <div className="flex-1 overflow-y-auto">
              {filtered.map(t => (
                <TouchRow
                  key={t.id}
                  touch={t}
                  isSelected={selected?.id === t.id}
                  onClick={() => handleSelect(t)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Message detail ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selected ? (
            <>
              {/* Header strip */}
              <div className="shrink-0 border-b border-bdr px-5 py-4 bg-bg-s1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-xl text-text-pri tracking-wide leading-none">
                        {selected.company_name}
                      </span>
                      <StatusBadge status={selected.status} />
                      <ChannelBadge channel={selected.channel} />
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      {selected.contact_name && (
                        <span className="flex items-center gap-1 text-xs text-text-mut font-mono">
                          <User size={9} />
                          {selected.contact_name}
                        </span>
                      )}
                      {selected.contact_email && (
                        <span className="flex items-center gap-1 text-xs text-text-mut font-mono">
                          <Mail size={9} />
                          {selected.contact_email}
                        </span>
                      )}
                      {selected.scheduled_for && (
                        <span className="flex items-center gap-1 text-xs text-text-mut font-mono">
                          <Calendar size={9} />
                          {new Date(selected.scheduled_for + 'T12:00:00').toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric'
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Touch number pill */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <div className="text-right">
                      <span className="font-display text-2xl text-gtm-orange leading-none">
                        {selected.sequence_number}
                      </span>
                      <span className="text-text-mut text-xs font-mono"> / 5</span>
                    </div>
                    <div className="text-xxs text-text-mut font-mono">touch</div>
                  </div>
                </div>
              </div>

              {/* Message content area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Error */}
                {actionError && (
                  <div className="flex items-start gap-2 p-3 bg-danger/5 border border-danger/20 rounded-lg">
                    <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-xs text-danger">{actionError}</span>
                    </div>
                    <button onClick={() => setActionError(null)} className="text-text-mut hover:text-text-pri">
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* Subject line (email only) */}
                {(selected.channel === 'email' || selected.subject) && (
                  <div>
                    <div className="text-xxs font-mono text-text-mut uppercase tracking-widest mb-1.5">Subject</div>
                    {editing ? (
                      <input
                        value={editSubject}
                        onChange={e => setEditSubject(e.target.value)}
                        placeholder="Email subject…"
                        className="input-base w-full text-sm py-2"
                      />
                    ) : (
                      <div className="text-sm font-medium text-text-pri bg-bg-s2 border border-bdr rounded-lg px-3 py-2">
                        {selected.subject || <span className="text-text-mut italic">No subject</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* Message body */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xxs font-mono text-text-mut uppercase tracking-widest">Message</div>
                    {!editing && selected.status === 'draft' && (
                      <button
                        onClick={startEdit}
                        className="flex items-center gap-1 text-xxs font-mono text-text-mut hover:text-text-pri transition-colors"
                      >
                        <Edit3 size={9} /> Edit
                      </button>
                    )}
                  </div>

                  {editing ? (
                    <textarea
                      ref={bodyRef}
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      rows={10}
                      className="input-base w-full text-sm leading-relaxed py-3 font-mono resize-none"
                      placeholder="Message body…"
                    />
                  ) : (
                    <div className="bg-bg-s2 border border-bdr rounded-lg px-4 py-3 text-sm text-text-pri leading-relaxed whitespace-pre-wrap font-mono">
                      {selected.message_body}
                    </div>
                  )}
                </div>

                {/* Word/char count when editing */}
                {editing && (() => {
                  const isConnect = selected?.channel === 'linkedin_connection'
                  const limit = selected?.sequence_number === 5 ? 75
                    : selected?.channel === 'email' ? 100
                    : selected?.channel === 'linkedin_dm' ? (selected?.sequence_number === 2 ? 150 : 100)
                    : 120
                  if (isConnect) {
                    const chars = editBody.length
                    return (
                      <div className={`text-right text-xxs font-mono ${chars > 300 ? 'text-danger' : 'text-text-mut'}`}>
                        {chars} / 300 chars
                      </div>
                    )
                  }
                  const words = editBody.split(/\s+/).filter(Boolean).length
                  return (
                    <div className={`text-right text-xxs font-mono ${words > limit ? 'text-danger' : 'text-text-mut'}`}>
                      {words} / {limit} words
                    </div>
                  )
                })()}

                {/* Response notes (if any) */}
                {selected.response_notes && (
                  <div className="border border-bdr rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-bg-s2 border-b border-bdr">
                      <span className="text-xxs font-mono text-text-mut uppercase tracking-widest">Response Notes</span>
                    </div>
                    <div className="px-4 py-3 text-sm text-text-sec leading-relaxed">
                      {selected.response_notes}
                    </div>
                  </div>
                )}

                {/* Metadata footer */}
                <div className="pt-2 border-t border-bdr grid grid-cols-2 gap-x-6 gap-y-1.5">
                  <div className="flex items-center gap-1.5 text-xxs font-mono text-text-mut">
                    <Building2 size={9} />
                    <span className="text-text-sec">{selected.company_name}</span>
                  </div>
                  {selected.created_at && (
                    <div className="flex items-center gap-1.5 text-xxs font-mono text-text-mut">
                      <Clock size={9} />
                      <span>Created {new Date(selected.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                  )}
                  {selected.approved_at && (
                    <div className="flex items-center gap-1.5 text-xxs font-mono text-ok">
                      <CheckCircle size={9} />
                      <span>Approved {new Date(selected.approved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                  {selected.sent_at && (
                    <div className="flex items-center gap-1.5 text-xxs font-mono text-info">
                      <Send size={9} />
                      <span>Sent {new Date(selected.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Action bar ── */}
              <div className="shrink-0 border-t border-bdr px-5 py-3 bg-bg-s1">
                {editing ? (
                  /* Edit mode actions */
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="btn-ghost text-xs border border-bdr flex items-center gap-1.5"
                    >
                      <X size={11} /> Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving || !editBody.trim()}
                      className="btn-primary text-xs flex items-center gap-1.5"
                    >
                      {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                      Save Changes
                    </button>
                  </div>
                ) : (
                  /* Normal mode actions */
                  <div className="flex items-center gap-2">
                    <div className="text-xxs font-mono text-text-mut flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-warn inline-block" />
                      Human gate — nothing sends without your approval
                    </div>

                    <div className="flex-1" />

                    {/* Skip — only for draft */}
                    {selected.status === 'draft' && (
                      <button
                        onClick={handleSkip}
                        disabled={!isActionable}
                        className="btn-ghost text-xs border border-bdr flex items-center gap-1.5 text-text-mut hover:text-danger hover:border-danger/40"
                      >
                        {actionLoading === 'skip'
                          ? <Loader2 size={11} className="animate-spin" />
                          : <SkipForward size={11} />}
                        Skip
                      </button>
                    )}

                    {/* Approve — only for draft */}
                    {selected.status === 'draft' && (
                      <button
                        onClick={handleApprove}
                        disabled={!isActionable}
                        className="btn-primary text-xs flex items-center gap-1.5"
                      >
                        {actionLoading === 'approve'
                          ? <Loader2 size={11} className="animate-spin" />
                          : <CheckCircle size={11} />}
                        ✅ Approve
                      </button>
                    )}

                    {/* Send — only appears + only works if approved */}
                    {selected.status === 'approved' && (
                      <button
                        onClick={handleSend}
                        disabled={!canSend}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors
                          bg-gtm-orange text-white hover:bg-gtm-orange/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === 'send'
                          ? <Loader2 size={11} className="animate-spin" />
                          : <Send size={11} />}
                        Send
                      </button>
                    )}

                    {/* Sent / replied / bounced — show status, no action */}
                    {['sent', 'replied', 'bounced', 'skipped'].includes(selected.status) && (
                      <div className="flex items-center gap-1.5 text-xs text-text-mut font-mono">
                        <ChevronRight size={11} />
                        {selected.status === 'sent'    && 'Message sent — awaiting reply'}
                        {selected.status === 'replied' && 'Reply received — update CRM'}
                        {selected.status === 'bounced' && 'Delivery failed — check email'}
                        {selected.status === 'skipped' && 'Touch skipped'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* No touch selected */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-10 h-10 rounded-full bg-bg-s2 border border-bdr flex items-center justify-center">
                <Send size={18} className="text-text-mut" />
              </div>
              <div>
                <div className="text-sm text-text-sec">Select a touch to review</div>
                <div className="text-xs text-text-mut mt-1">
                  Approve, edit, or skip — then send when ready.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Search, Bell, RefreshCw, ChevronRight } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import CommandPalette from './CommandPalette'
import NotificationPanel from './NotificationPanel'
import { useAppStore } from '../store'
import { useUI } from '../context/UIContext'

const BREADCRUMBS = {
  '/dashboard':   ['Command Center'],
  '/sam':         ['Agents', 'Sam'],
  '/rex':         ['Agents', 'Rex'],
  '/andy':        ['Agents', 'Andy'],
  '/finn':        ['Agents', 'Finn'],
  '/ola':         ['Agents', 'Ola'],
  '/pipeline':    ['Workspace', 'Pipeline'],
  '/outreach':    ['Workspace', 'Outreach'],
  '/prospects':   ['Workspace', 'Prospects'],
  '/nurture':     ['Workspace', 'Nurture'],
  '/trends':      ['Workspace', 'Trends'],
  '/memo':        ['Workspace', 'Meetings'],
  '/proposals':   ['Workspace', 'Proposals'],
  '/content':     ['Workspace', 'Content'],
  '/okrs':        ['System', 'OKRs'],
  '/cleanup':     ['System', 'CRM Quality'],
  '/automations': ['System', 'Automations'],
  '/errors':      ['System', 'Errors'],
  '/settings':    ['System', 'Settings'],
}

export default function Header() {
  const [cmdOpen,   setCmdOpen]   = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const { sidebarCollapsed } = useUI()
  const location = useLocation()

  const refresh         = useAppStore(s => s.refresh)
  const loading         = useAppStore(s => s.loading)
  const escalationCount = useAppStore(s => s.escalationCount)
  const lastRefresh     = useAppStore(s => s.lastRefresh)

  const leftOffset = sidebarCollapsed ? 'left-[48px]' : 'left-[200px]'

  // Cmd+K global handler (also handled in useKeyboard but kept here for safety)
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(true)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // Escape to close panels
  useEffect(() => {
    const h = () => { setCmdOpen(false); setNotifOpen(false) }
    window.addEventListener('gtm:close', h)
    return () => window.removeEventListener('gtm:close', h)
  }, [])

  const lastRefreshStr = lastRefresh
    ? lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null

  const crumbs = BREADCRUMBS[location.pathname] || []

  return (
    <>
      <header
        className={`fixed top-0 ${leftOffset} right-0 h-12 z-10 flex items-center px-4 gap-3
                    transition-all duration-200`}
        style={{
          background: '#111118',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.03)',
        }}
      >

        {/* Breadcrumb */}
        {crumbs.length > 0 && (
          <div className="flex items-center gap-1.5 text-xxs font-mono">
            <span className="text-white/25">GTM360</span>
            {crumbs.map((c, i) => (
              <span key={c} className="flex items-center gap-1.5">
                <ChevronRight size={9} className="text-white/15" />
                <span className={i === crumbs.length - 1 ? 'text-white/70' : 'text-white/30'}>
                  {c}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Search trigger */}
        <button
          onClick={() => setCmdOpen(true)}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm
                     text-text-mut hover:text-text-sec transition-all flex-1 max-w-xs cursor-pointer ml-2"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <Search size={12} className="text-text-mut" />
          <span className="flex-1 text-left text-xs text-text-mut">Search or run command...</span>
          <kbd className="text-xxs px-1.5 py-0.5 rounded font-mono text-white/20"
               style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            ⌘K
          </kbd>
        </button>

        <div className="flex-1" />

        {/* Last sync */}
        {lastRefreshStr && (
          <span className="text-xxs font-mono text-text-mut hidden md:block">
            synced {lastRefreshStr}
          </span>
        )}

        {/* Refresh */}
        <button
          onClick={refresh}
          disabled={loading}
          title="Refresh all data"
          className="p-2 rounded-lg text-text-mut hover:text-text-sec transition-colors
                     hover:bg-white/5 cursor-pointer disabled:opacity-40"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-gtm-orange' : ''} />
        </button>

        {/* Notifications */}
        <button
          onClick={() => setNotifOpen(true)}
          title="Notifications"
          className="relative p-2 rounded-lg text-text-mut hover:text-text-sec transition-colors
                     hover:bg-white/5 cursor-pointer"
        >
          <Bell size={13} />
          {escalationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-gtm-orange rounded-full
                             text-xxs font-mono text-white flex items-center justify-center leading-none">
              {escalationCount > 9 ? '9+' : escalationCount}
            </span>
          )}
        </button>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer
                        transition-colors hover:bg-gtm-orange/20"
             style={{ background: 'rgba(255,77,0,0.1)', border: '1px solid rgba(255,77,0,0.2)' }}>
          <span className="text-xs font-display text-gtm-orange">SJ</span>
        </div>

      </header>

      <CommandPalette open={cmdOpen}   onClose={() => setCmdOpen(false)} />
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  )
}

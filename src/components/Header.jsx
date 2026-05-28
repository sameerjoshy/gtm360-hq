import { useState, useEffect } from 'react'
import { Search, Bell, RefreshCw } from 'lucide-react'
import CommandPalette from './CommandPalette'
import NotificationPanel from './NotificationPanel'
import { useAppStore } from '../store'

export default function Header() {
  const [cmdOpen,   setCmdOpen]   = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const refresh         = useAppStore(s => s.refresh)
  const loading         = useAppStore(s => s.loading)
  const escalationCount = useAppStore(s => s.escalationCount)
  const lastRefresh     = useAppStore(s => s.lastRefresh)

  // Cmd+K global handler
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

  const lastRefreshStr = lastRefresh
    ? lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <>
      <header className="fixed top-0 left-[200px] right-0 h-12 bg-bg-s1 border-b border-bdr z-10 flex items-center px-5 gap-3"
        style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' }}
      >

        {/* Search trigger */}
        <button
          onClick={() => setCmdOpen(true)}
          className="flex items-center gap-2 bg-bg-s2 border border-bdr rounded-lg px-3 py-1.5 text-sm text-text-mut hover:border-accent/40 hover:text-text-sec transition-all flex-1 max-w-sm cursor-pointer"
        >
          <Search size={13} className="text-text-mut" />
          <span className="flex-1 text-left text-sm">Search or run command...</span>
          <kbd className="text-xxs bg-bg-s1 px-1.5 py-0.5 rounded border border-bdr font-mono text-text-mut">⌘K</kbd>
        </button>

        <div className="flex-1" />

        {/* Last refresh timestamp */}
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
          className="btn-ghost p-2 rounded-lg cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-accent' : 'text-text-sec'} />
        </button>

        {/* Notifications */}
        <button
          onClick={() => setNotifOpen(true)}
          title="Open notifications"
          className="relative btn-ghost p-2 rounded-lg cursor-pointer"
        >
          <Bell size={14} className="text-text-sec" />
          {escalationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent rounded-full text-xxs font-mono text-white flex items-center justify-center leading-none">
              {escalationCount}
            </span>
          )}
        </button>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/25 flex items-center justify-center cursor-pointer hover:bg-accent/20 transition-colors">
          <span className="text-xs font-display text-accent font-bold">SJ</span>
        </div>

      </header>

      <CommandPalette open={cmdOpen}   onClose={() => setCmdOpen(false)} />
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  )
}

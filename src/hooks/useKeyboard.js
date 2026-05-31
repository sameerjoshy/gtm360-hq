import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUI } from '../context/UIContext'

/**
 * Global keyboard shortcuts for GTM360 HQ.
 *
 * Cmd+B        — toggle sidebar
 * Escape       — close any open overlay (via custom event)
 * Cmd+Enter    — submit active form (via custom event)
 *
 * Vim-style navigate (type G then key within 600ms):
 *   G → C      — Command Center (/dashboard)
 *   G → R      — Rex (/rex)
 *   G → A      — Andy (/andy)
 *   G → S      — Sam (/sam)
 *   G → O      — Outreach (/outreach)
 *   G → P      — Proposals (/proposals)
 *   G → T      — Trends (/trends)
 */
export function useKeyboard() {
  const navigate         = useNavigate()
  const { toggleSidebar } = useUI()
  const gPressedRef      = useRef(false)
  const gTimerRef        = useRef(null)

  useEffect(() => {
    const NAV_MAP = {
      c: '/dashboard',
      r: '/rex',
      a: '/andy',
      s: '/sam',
      o: '/outreach',
      p: '/proposals',
      t: '/trends',
      i: '/prospects',
      m: '/memo',
      n: '/nurture',
    }

    const handleKeydown = (e) => {
      const tag   = document.activeElement?.tagName
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)
      const meta  = e.metaKey || e.ctrlKey

      // Cmd+B — sidebar toggle (global, ignore input)
      if (meta && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
        return
      }

      // Escape — broadcast close event
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('gtm:close'))
        return
      }

      // Cmd+Enter — broadcast submit event
      if (meta && e.key === 'Enter') {
        window.dispatchEvent(new CustomEvent('gtm:submit'))
        return
      }

      // Don't handle G-nav when typing in inputs
      if (isInput || meta) return

      // G → then nav key
      if (e.key === 'g' || e.key === 'G') {
        gPressedRef.current = true
        clearTimeout(gTimerRef.current)
        gTimerRef.current = setTimeout(() => {
          gPressedRef.current = false
        }, 600)
        return
      }

      if (gPressedRef.current) {
        const dest = NAV_MAP[e.key.toLowerCase()]
        if (dest) {
          e.preventDefault()
          gPressedRef.current = false
          clearTimeout(gTimerRef.current)
          navigate(dest)
        }
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => {
      window.removeEventListener('keydown', handleKeydown)
      clearTimeout(gTimerRef.current)
    }
  }, [navigate, toggleSidebar])
}

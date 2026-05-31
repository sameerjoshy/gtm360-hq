import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counterRef = useRef(0)

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = ++counterRef.current
    setToasts(prev => [...prev, { id, message, type, duration }])
    if (type !== 'error' || duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (msg, duration)  => addToast(msg, 'success', duration ?? 3000),
    error:   (msg, duration)  => addToast(msg, 'error',   duration ?? 6000),
    info:    (msg, duration)  => addToast(msg, 'info',    duration ?? 4000),
  }

  return (
    <ToastContext.Provider value={{ toasts, toast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx.toast
}

export function useToastState() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToastState must be used inside ToastProvider')
  return { toasts: ctx.toasts, removeToast: ctx.removeToast }
}

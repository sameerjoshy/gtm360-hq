import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import { useToastState } from '../context/ToastContext'

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle,
    bar:  'bg-ok',
    text: 'text-ok',
    bg:   'bg-bg-s1 border-ok/20',
  },
  error: {
    icon: AlertCircle,
    bar:  'bg-danger',
    text: 'text-danger',
    bg:   'bg-bg-s1 border-danger/20',
  },
  info: {
    icon: Info,
    bar:  'bg-info',
    text: 'text-info',
    bg:   'bg-bg-s1 border-info/20',
  },
}

function ToastItem({ toast, onRemove }) {
  const cfg = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info
  const Icon = cfg.icon

  return (
    <div
      className={`relative flex items-start gap-3 px-4 py-3 rounded-xl border shadow-panel
                  min-w-[280px] max-w-[400px] animate-fadeIn overflow-hidden ${cfg.bg}`}
    >
      {/* Left color bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${cfg.bar}`} />

      <Icon size={15} className={`${cfg.text} shrink-0 mt-0.5`} />
      <span className="text-sm text-text-pri flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-text-mut hover:text-text-sec transition-colors shrink-0 mt-0.5"
      >
        <X size={13} />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastState()

  if (!toasts.length) return null

  return (
    <div
      className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end"
      aria-live="polite"
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  )
}

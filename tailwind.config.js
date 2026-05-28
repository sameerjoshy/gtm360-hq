/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Brand ──────────────────────────────────────────────
        'gtm-orange': '#FF4D00',   // brand accent (logo, key CTAs)

        // ── Sidebar (deep vibrant blue — NOT navy/black) ───────
        'sidebar':       '#1E40AF', // blue-800
        'sidebar-hover': 'rgba(255,255,255,0.10)',
        'sidebar-active':'rgba(255,255,255,0.16)',

        // ── Content surface ────────────────────────────────────
        'bg-base': '#F1F5F9',   // slate-100 — page background
        'bg-s1':   '#FFFFFF',   // white — cards, panels
        'bg-s2':   '#F8FAFC',   // slate-50 — hover states, nested panels
        'bdr':     '#E2E8F0',   // slate-200 — borders

        // ── Text ───────────────────────────────────────────────
        'text-pri': '#0F172A',  // slate-900
        'text-sec': '#475569',  // slate-600
        'text-mut': '#94A3B8',  // slate-400

        // ── Accent (indigo) ────────────────────────────────────
        'accent':       '#6366F1', // indigo-500
        'accent-hover': '#4F46E5', // indigo-600
        'accent-light': '#EEF2FF', // indigo-50

        // ── Status — tuned for light backgrounds ───────────────
        'ok':           '#059669', // emerald-600
        'ok-light':     '#D1FAE5', // emerald-100
        'warn':         '#D97706', // amber-600
        'warn-light':   '#FEF3C7', // amber-100
        'danger':       '#EF4444', // red-500
        'danger-light': '#FEE2E2', // red-100
        'danger-soft':  '#DC2626', // red-600 (Sam's flag label)
        'info':         '#3B82F6', // blue-500
        'info-light':   '#DBEAFE', // blue-100
      },
      fontSize: {
        'xxs': ['0.6875rem', { lineHeight: '1rem' }],    // 11px
        'xs':  ['0.8125rem', { lineHeight: '1.25rem' }], // 13px
        'sm':  ['0.875rem',  { lineHeight: '1.375rem' }], // 14px
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"DM Mono"', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.10)',
        'header': '0 1px 3px 0 rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Brand ──────────────────────────────────────────────────────────
        'gtm-orange': '#FF4D00',      // primary brand accent

        // ── Sidebar ────────────────────────────────────────────────────────
        'sidebar':        '#0F1624',              // dark navy
        'sidebar-hover':  'rgba(255,255,255,0.06)',
        'sidebar-active': 'rgba(255,77,0,0.14)',

        // ── Content surfaces ───────────────────────────────────────────────
        'bg-base': '#0A0A0F',   // deepest background
        'bg-s1':   '#111118',   // cards, panels
        'bg-s2':   '#16161F',   // hover states, nested panels, inputs
        'bdr':     '#2A2A3A',   // borders — visible but subtle

        // ── Text ───────────────────────────────────────────────────────────
        'text-pri': '#F0F0F8',  // headings, important data — near white
        'text-sec': '#B8B8D0',  // body text — readable on dark
        'text-mut': '#9999BB',  // labels, captions, metadata

        // ── Accent — GTM Orange ────────────────────────────────────────────
        'accent':       '#FF4D00',
        'accent-hover': '#E64400',
        'accent-light': 'rgba(255,77,0,0.12)',

        // ── Status ─────────────────────────────────────────────────────────
        'ok':           '#00E676',
        'ok-light':     'rgba(0,230,118,0.12)',
        'warn':         '#FFD600',
        'warn-light':   'rgba(255,214,0,0.12)',
        'danger':       '#FF4444',
        'danger-light': 'rgba(255,68,68,0.12)',
        'danger-soft':  '#FF6666',
        'info':         '#2979FF',
        'info-light':   'rgba(41,121,255,0.12)',
      },
      fontSize: {
        'xxs': ['0.6875rem', { lineHeight: '1rem' }],     // 11px
        'xs':  ['0.8125rem', { lineHeight: '1.25rem' }],  // 13px
        'sm':  ['0.875rem',  { lineHeight: '1.5rem'   }], // 14px
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"DM Mono"', 'monospace'],
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.6)',
        'header':     '0 1px 0 rgba(255,255,255,0.04)',
        'panel':      '0 0 0 1px rgba(255,255,255,0.04), 0 16px 40px rgba(0,0,0,0.6)',
        'orange-glow':'0 0 16px rgba(255,77,0,0.3)',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.4' },
        },
        countUp: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer:       'shimmer 1.5s linear infinite',
        fadeIn:        'fadeIn 0.2s ease forwards',
        slideInRight:  'slideInRight 0.3s cubic-bezier(0.22,1,0.36,1)',
        pulseGlow:     'pulseGlow 2s ease-in-out infinite',
        countUp:       'countUp 0.4s ease forwards',
      },
    },
  },
  plugins: [],
}

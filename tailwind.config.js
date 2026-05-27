/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'gtm-orange':  '#FF4D00',
        'gtm-amber':   '#FF8C00',
        'bg-base':     '#0A0A0F',
        'bg-s1':       '#16161F',   // was #111118 — lightened for contrast
        'bg-s2':       '#1E1E2E',   // was #1A1A24
        'bdr':         '#2A2A3A',   // was #22222E — more visible borders
        'text-pri':    '#FFFFFF',   // was #F0F0F8 — pure white
        'text-sec':    '#AAAACC',   // was #8888AA
        'text-mut':    '#7777AA',   // was #55556A
        'danger-soft': '#FF6B6B',   // lighter red for Sam's Flag label
        'ok':          '#00E676',
        'warn':        '#FFD600',
        'danger':      '#FF1744',
        'info':        '#2979FF',
      },
      fontSize: {
        // Override defaults for better readability
        'xxs': ['0.6875rem', { lineHeight: '1rem' }],    // 11px
        'xs':  ['0.8125rem', { lineHeight: '1.25rem' }], // 13px
        'sm':  ['0.875rem',  { lineHeight: '1.375rem' }], // 14px
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"DM Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}

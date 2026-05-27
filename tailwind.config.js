/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'gtm-orange': '#FF4D00',
        'gtm-amber':  '#FF8C00',
        'bg-base':    '#0A0A0F',
        'bg-s1':      '#111118',
        'bg-s2':      '#1A1A24',
        'bdr':        '#22222E',
        'text-pri':   '#F0F0F8',
        'text-sec':   '#8888AA',
        'text-mut':   '#55556A',
        'ok':         '#00E676',
        'warn':       '#FFD600',
        'danger':     '#FF1744',
        'info':       '#2979FF',
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

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ─── Colours mapped to CSS variables ──────────────────────────────────
      colors: {
        bg:              'var(--bg)',
        surface:         'var(--surface)',
        card:            'var(--card)',
        'card-hover':    'var(--card-hover)',
        border:          'var(--border)',
        'border-hover':  'var(--border-hover)',
        accent:          'var(--accent)',
        'accent-dim':    'var(--accent-dim)',
        'accent-glow':   'var(--accent-glow)',
        gold:            'var(--gold)',
        'gold-dim':      'var(--gold-dim)',
        'gold-glow':     'var(--gold-glow)',
        danger:          'var(--danger)',
        'danger-dim':    'var(--danger-dim)',
        'danger-glow':   'var(--danger-glow)',
        info:            'var(--info)',
        cyan:            'var(--cyan)',
        purple:          'var(--purple)',
        warning:         'var(--warning)',
        text:            'var(--text)',
        dim:             'var(--dim)',
        muted:           'var(--muted)',
        disabled:        'var(--disabled)',
        'grade-a':       'var(--grade-a)',
        'grade-b':       'var(--grade-b)',
        'grade-c':       'var(--grade-c)',
        'grade-d':       'var(--grade-d)',
      },

      // ─── Typography ───────────────────────────────────────────────────────
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        sans:    ['Outfit', 'system-ui', 'sans-serif'],
        mono:    ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },

      // ─── Shadows ──────────────────────────────────────────────────────────
      boxShadow: {
        'accent':    '0 0 20px var(--accent-glow)',
        'accent-lg': '0 0 40px var(--accent-glow)',
        'gold':      '0 0 20px var(--gold-glow)',
        'gold-lg':   '0 0 40px var(--gold-glow)',
        'danger':    '0 0 20px var(--danger-glow)',
        'card':      '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-lg':   '0 8px 48px rgba(0, 0, 0, 0.6)',
        'modal':     '0 24px 80px rgba(0, 0, 0, 0.6)',
      },

      // ─── Border radius ────────────────────────────────────────────────────
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },

      // ─── Animations ───────────────────────────────────────────────────────
      animation: {
        'pulse-subtle':  'pulse-subtle 3s ease-in-out infinite',
        'glow-pulse':    'glow-pulse 2s ease-in-out infinite',
        'fade-up':       'fade-up 0.3s ease-out forwards',
        'fade-in':       'fade-in 0.2s ease-out forwards',
        'slide-down':    'slide-down 0.3s ease-out forwards',
        'slide-up':      'slide-up 0.3s ease-out forwards',
        'shimmer':       'shimmer 2s linear infinite',
        'spin-slow':     'spin 3s linear infinite',
        'bounce-subtle': 'bounce-subtle 1s ease-in-out infinite',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { boxShadow: '0 0 16px var(--accent-glow)' },
          '50%':       { boxShadow: '0 0 32px var(--accent-glow)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%':       { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          from: { backgroundPosition: '-200% 0' },
          to:   { backgroundPosition: '200% 0' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':       { transform: 'translateY(-4px)' },
        },
      },

      // ─── Backdrop blur ────────────────────────────────────────────────────
      backdropBlur: {
        xs: '4px',
      },

      // ─── Spacing extras ───────────────────────────────────────────────────
      spacing: {
        '18':  '4.5rem',
        '88':  '22rem',
        '112': '28rem',
        '128': '32rem',
      },

      // ─── Z-index ──────────────────────────────────────────────────────────
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
      },

      // ─── Extra screens ────────────────────────────────────────────────────
      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [],
}

export default config

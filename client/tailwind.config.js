/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#ffffff',
          1: '#f8fafc',
          2: '#f1f5f9',
          3: '#e2e8f0',
        },
        border: {
          DEFAULT: '#e2e8f0',
          subtle: '#f1f5f9',
          hover: '#cbd5e1',
        },
        text: {
          primary: '#0f172a',
          secondary: '#475569',
          tertiary: '#94a3b8',
        },
        accent: {
          DEFAULT: '#7c3aed',
          light: '#8b5cf6',
          dark: '#6d28d9',
          muted: 'rgba(124, 58, 237, 0.08)',
          text: '#7c3aed',
        },
        pop: {
          pink: '#ec4899',
          coral: '#f97316',
          teal: '#14b8a6',
          sky: '#0ea5e9',
        },
        positive: '#10b981',
        negative: '#ef4444',
        warn: '#f59e0b',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"SF Mono"', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card': '0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 30px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
        'glow-violet': '0 4px 24px rgba(124, 58, 237, 0.15)',
        'glow-pink': '0 4px 24px rgba(236, 72, 153, 0.12)',
        'input-focus': '0 0 0 3px rgba(124, 58, 237, 0.12)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #7c3aed, #ec4899)',
        'gradient-brand-soft': 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(236,72,153,0.06))',
        'gradient-hero': 'linear-gradient(135deg, #7c3aed 0%, #a855f7 30%, #ec4899 70%, #f97316 100%)',
        'gradient-card': 'linear-gradient(180deg, #ffffff 0%, #faf5ff 100%)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    }
  },
  plugins: []
};

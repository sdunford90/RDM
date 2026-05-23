/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        canvas:  '#F7F8FA',
        surface: '#FFFFFF',
        muted:   '#F1F3F7',
        hairline: '#E5E7EB',
        rule:    '#CBD2DC',

        ink: {
          DEFAULT: '#0F172A',
          1: '#0F172A',
          2: '#475569',
          3: '#64748B',
          4: '#94A3B8'
        },

        accent: {
          DEFAULT: '#0E7490',
          hover:   '#155E75',
          subtle:  '#ECFEFF',
          ring:    '#A5F3FC'
        },

        // Stage palette — one per pipeline stage.
        stage: {
          new:           '#94A3B8',
          reviewing:     '#0EA5E9',
          interested:    '#F59E0B',
          researching:   '#8B5CF6',
          loi:           '#6366F1',
          under_contract:'#10B981',
          closed:        '#0E7490',
          passed:        '#94A3B8'
        }
      },
      fontFamily: {
        sans: ['Inter', '"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        card:    '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 0 rgba(15, 23, 42, 0.02)',
        pop:     '0 4px 12px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.05)',
        ring:    '0 0 0 3px rgba(165, 243, 252, 0.65)'
      },
      borderRadius: {
        DEFAULT: '6px',
        lg: '10px',
        xl: '14px'
      }
    }
  },
  plugins: []
};

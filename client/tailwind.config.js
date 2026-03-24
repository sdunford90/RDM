/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0F1523',
          800: '#1A2236',
          700: '#2A3550',
          600: '#354163'
        },
        gold: {
          DEFAULT: '#C9A84C',
          light: '#D4BA6A',
          dark: '#B89A3E'
        },
        slate: {
          text: '#E8EDF5',
          secondary: '#8A9BBE'
        }
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace'],
        sans: ['Inter', '"DM Sans"', 'sans-serif']
      }
    }
  },
  plugins: []
};

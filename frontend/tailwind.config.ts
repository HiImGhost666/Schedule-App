import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f4f8fa',
          100: '#e3ebf0',
          200: '#ccd8e0',
          300: '#a6bbc8',
          400: '#7a99ac',
          500: '#4f758b',
          600: '#355d73',
          700: '#1e4358',
          800: '#123040',
          900: '#091f2c',
        },
        gold: {
          50: '#fbf0f2',
          100: '#f3d0d4',
          200: '#e89aa2',
          300: '#dc5f6c',
          400: '#d63244',
          500: '#c10016',
          600: '#ab0014',
          700: '#960012',
          800: '#73000d',
          900: '#4d0009',
        },
      },
      fontFamily: {
        sans: ['Wix Madefor Text', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(12px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideDown: { from: { transform: 'translateY(-8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
} satisfies Config;

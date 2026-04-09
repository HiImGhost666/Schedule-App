import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#d9e6f2',
          200: '#b3cde5',
          300: '#7da8cc',
          400: '#4d7ea8',
          500: '#1e3a5f',
          600: '#183050',
          700: '#122640',
          800: '#0c1c30',
          900: '#060e18',
        },
        gold: {
          50: '#fefbf0',
          100: '#fdf3d0',
          200: '#fbe6a0',
          300: '#f8d050',
          400: '#f5c518',
          500: '#d4a80e',
          600: '#a8850a',
          700: '#7c6208',
          800: '#504005',
          900: '#281f02',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
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

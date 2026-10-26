import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#070709',
          900: '#0B0B0F',
          850: '#111117',
          800: '#16161E',
          700: '#22222E',
          600: '#323242'
        },
        crimson: {
          950: '#450A0A',
          900: '#7F1D1D',
          800: '#991B1B',
          700: '#B91C1C',
          600: '#DC2626',
          500: '#EF4444',
          400: '#F87171'
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ]
      },
      boxShadow: {
        crimson: '0 0 28px -8px rgba(220, 38, 38, 0.45)',
        card: '0 8px 30px rgba(0, 0, 0, 0.35)',
        glow: '0 18px 44px -22px rgba(220, 38, 38, 0.7), 0 12px 40px -24px rgba(124, 58, 237, 0.85)',
        violet: '0 14px 36px -18px rgba(124, 58, 237, 0.75)',
        glass: '0 24px 48px -30px rgba(24, 16, 60, 0.45), 0 2px 10px -6px rgba(24, 16, 60, 0.2)'
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(135deg, #f43f5e 0%, #dc2626 46%, #7c3aed 150%)',
        'brand-soft':
          'radial-gradient(60rem 40rem at 10% -10%, rgba(124,58,237,0.22), transparent 60%), radial-gradient(50rem 34rem at 110% 0%, rgba(220,38,38,0.18), transparent 58%)'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' }
        }
      },
      animation: {
        float: 'float 6s ease-in-out infinite'
      }
    }
  },
  plugins: []
};

export default config;

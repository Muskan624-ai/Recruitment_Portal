import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        palace: {
          aqua: '#00BFA5',
          teal: '#009688',
          sandstone: '#DEC7AA',
          travertine: '#D9C3A5',
          mauve: '#B59A84',
          taupe: '#9E8070',
          blush: '#EE6E93',
          coral: '#F48FB1',
          basin: '#E07A9A',
          cyan: '#26E6E6',
          pool: '#64FFDA',
          foam: '#E0F7FA',
          gold: '#FFB300',
          saffron: '#FFC107',
          lily: '#76C043',
        },
        obsidian: {
          sea: '#00BFA5',
          base: '#1E293B',
          wall: '#DEC7AA',
          elevated: '#F5ECE0',
        },
        neon: {
          cyan: '#00E5FF',
          glow: '#64FFDA',
        },
        rose: {
          muted: '#E07A9A',
          stone: '#EE6E93',
          trim: '#F48FB1',
        },
        astral: {
          gold: '#FFB300',
          amber: '#FFC107',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Cinzel', 'serif'],
        sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Space Mono', 'monospace'],
      },
      boxShadow: {
        'mv-cyan': '3px 3px 0px rgba(0, 229, 255, 0.3)',
        'mv-cyan-strong': '4px 4px 0px rgba(0, 229, 255, 0.55)',
        'mv-gold': '3px 3px 0px rgba(255, 179, 0, 0.4)',
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--bg-canvas) / <alpha-value>)',
        surface: 'rgb(var(--bg-surface) / <alpha-value>)',
        subtle: 'rgb(var(--bg-subtle) / <alpha-value>)',
        tint: 'rgb(var(--bg-tint) / <alpha-value>)',
        ink: 'rgb(var(--ink-primary) / <alpha-value>)',
        forest: 'rgb(var(--brand-primary) / <alpha-value>)',
        pine: 'rgb(var(--brand-secondary) / <alpha-value>)',
        hairline: 'rgb(var(--border-hairline) / <alpha-value>)',
        'tint-border': 'rgb(var(--border-tint) / <alpha-value>)',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;


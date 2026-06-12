import type { Config } from 'tailwindcss';

/**
 * True-black, high-contrast minimal theme. Pure black canvas, faintly lifted
 * dark surfaces, near-white ink, and a restrained near-white accent so active
 * states read as crisp white-on-black. Semantic green/red only for money
 * direction. No warm tones — this deliberately avoids the editorial look.
 *
 * Token names are kept stable (canvas/surface/ink/brass/…) so components don't
 * need to change when the palette does. "brass" is now the neutral accent.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#000000', // pure black background
        surface: '#0c0c0e', // raised panel
        surface2: '#171719', // hover / inset
        line: '#242427', // hairline borders
        ink: '#f4f4f5', // primary text
        muted: '#9a9aa2', // secondary text
        faint: '#5d5d64', // tertiary
        brass: '#fafafa', // accent → crisp white for active/highlight
        brassDim: '#3a3a40', // hover borders / subtle dividers
        positive: '#5cc98e', // credits / received
        negative: '#e06b59', // debits / sent
      },
      fontFamily: {
        // Geist throughout (x.ai / Vercel technical feel); Geist Mono for figures.
        display: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;

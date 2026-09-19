import { Cormorant_Unicase, Lexend } from 'next/font/google';

// The display/body pairing, self-hosted at build time: next/font serves both
// families from our own origin, so no request reaches fonts.googleapis.com at
// runtime. Both are SIL OFL 1.1, which permits exactly that with no UI
// attribution. See claude-docs/styling.md, "Type".
//
// `adjustFontFallback` is left at its default of true: it synthesizes a local
// fallback face metric-matched to each family, so `display: 'swap'` swaps
// glyphs without reflowing anything. Setting it false reintroduces the shift.
//
// A module rather than declarations in layout.tsx, per the Next.js guidance on
// multiple fonts, so both stay a single shared instance.

// No variable axis, so the weights have to be named — and only the three the
// type scale uses, since every extra weight is another file on the wire.
export const display = Cormorant_Unicase({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

// Variable across 100–900, so one file covers every weight.
export const body = Lexend({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

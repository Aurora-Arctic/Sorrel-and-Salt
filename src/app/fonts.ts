import { Cormorant_Unicase, Lexend } from 'next/font/google';

// M0.6 — the display/body pairing, self-hosted at build time.
//
// next/font downloads both families during `next build` and serves them from
// our own origin, so there is no request to fonts.googleapis.com or
// fonts.gstatic.com at runtime: no third-party DNS/connect on the critical
// path, and nothing about a visitor's page load reaching Google.
//
// Both are SIL Open Font License 1.1 — self-hosting and embedding are exactly
// what that licence permits, with no attribution required in the UI.
//
// Layout shift: `adjustFontFallback` defaults to true, which synthesizes a
// local fallback face with `size-adjust`/`ascent-override` matched to each
// family's metrics. The fallback therefore occupies the same box as the real
// font, so `display: 'swap'` swaps glyphs without reflowing anything around
// them. Do not set `adjustFontFallback: false` — that is the setting that
// would reintroduce the shift.
//
// Exported as a module rather than declared in layout.tsx per the Next.js
// guidance on using multiple fonts, so both stay a single shared instance.

// Cormorant Unicase has no variable axis, so the weights have to be named.
// Only the three the type scale actually uses are requested — every extra
// weight is another file on the wire.
export const display = Cormorant_Unicase({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

// Lexend is variable across 100–900, so one file covers every weight.
export const body = Lexend({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

import { Cormorant_Unicase, Lexend } from 'next/font/google';

// Self-hosted at build time by next/font, so no request reaches
// fonts.googleapis.com at runtime; both are SIL OFL 1.1. `adjustFontFallback`
// stays at its default — false reintroduces layout shift. One module, not
// declarations in layout.tsx, so both are a single shared instance.
// See claude-docs/styling.md, "Type".

// No variable axis: only the three weights the scale uses, each a file on the wire.
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

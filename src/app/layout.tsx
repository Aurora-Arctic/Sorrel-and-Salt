import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { body, display } from './fonts';
import './globals.scss';

export const metadata: Metadata = {
  title: 'Sorrel & Salt',
  description: 'A compendium, ingredient store and grimoire.',
};

// Pre-paint init script (M0.29), in place of resume-2026's gatsby-ssr.ts —
// runs synchronously before first paint so a stored choice never flashes the
// wrong theme. Deliberately does nothing when no choice is stored: globals.scss
// resolves an absent data-theme attribute through prefers-color-scheme, so
// stamping the resolved theme here on every load would dead-end that tier and
// force this script to grow the matchMedia change listener resume-2026
// carries. Wrapped in try/catch since a blocked localStorage should cost
// persistence, not break the page.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  // Both fonts are applied as CSS variables rather than className, because the
  // Sass stacks ($font-body/$font-heading) reference --font-body and
  // --font-display and need them in scope for the whole document.
  //
  // suppressHydrationWarning is scoped to <html> only: the init script above
  // is the one thing that mutates it before React hydrates, and per the
  // Next.js flash-prevention guide the warning suppression should cover only
  // the element the script touches, not the tree beneath it.
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

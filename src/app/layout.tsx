import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { body, display } from './fonts';
import './globals.scss';

export const metadata: Metadata = {
  title: 'Sorrel & Salt',
  description: 'A compendium, ingredient store and grimoire.',
};

// Runs synchronously before first paint, so a stored choice never flashes the
// wrong theme. Deliberately does nothing when no choice is stored: globals.scss
// resolves an absent data-theme through prefers-color-scheme, and stamping a
// resolved theme here would dead-end that tier and force this script to grow a
// matchMedia change listener. try/catch because a blocked localStorage should
// cost persistence, not the page.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  // CSS variables rather than className: the Sass stacks reference
  // --font-body / --font-display and need them in scope document-wide.
  //
  // suppressHydrationWarning is scoped to <html> alone — the init script above
  // is the one thing mutating it before hydration, and the suppression should
  // cover only the element the script touches, not the tree beneath it.
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

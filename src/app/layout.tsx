import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import ThemeToggle from '../components/ThemeToggle';
import { body, display } from './fonts';
import './globals.scss';

export const metadata: Metadata = {
  title: 'Sorrel & Salt',
  description: 'A compendium, ingredient store and grimoire.',
};

// Runs before first paint, so a stored choice never flashes the wrong theme.
// With nothing stored it sets nothing: globals.scss resolves an absent
// data-theme through prefers-color-scheme, and stamping one here would need a
// matchMedia listener. A blocked localStorage costs persistence, not the page.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  // CSS variables rather than className: the Sass stacks read --font-* document-wide.
  // suppressHydrationWarning on <html> alone, the one element the script mutates.
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {/* Every page gets it, signed in or not — M2.6 moved it here from the
            home page, which was the only page that existed yet. */}
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}

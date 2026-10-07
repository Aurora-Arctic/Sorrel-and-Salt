import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Backdrop from '../components/Backdrop';
import ThemeToggle from '../components/ThemeToggle';
import { impersonationEnabled } from '../lib/impersonation';
import { body, display } from './fonts';
import ImpersonationBannerSlot from './impersonation-banner';
import PrePaintScripts from './pre-paint-scripts';
import Providers from './providers';
import './globals.scss';

export const metadata: Metadata = {
  title: 'Sorrel & Salt',
  description: 'A compendium, ingredient store and grimoire.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // CSS variables rather than className: the Sass stacks read --font-* document-wide.
  // suppressHydrationWarning on <html> alone, the one element the theme script mutates.
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <PrePaintScripts />
      </head>
      <body>
        {/* First, above what it describes; mounted only where impersonation is
            registered, so production pays nothing for it (MB.53). */}
        {impersonationEnabled() && <ImpersonationBannerSlot />}
        {/* Every page gets it, signed in or not — M2.6 moved it here from the
            home page, which was the only page that existed yet. */}
        <ThemeToggle />
        {/* Around the page alone: the toggle and backdrop query nothing. */}
        <Providers>{children}</Providers>
        {/* Last, so it never precedes the page in reading order even for a
            tool that ignores aria-hidden. */}
        <Backdrop />
      </body>
    </html>
  );
}

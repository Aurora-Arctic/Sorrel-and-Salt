import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Backdrop from '../components/Backdrop';
import { StatusRegionProvider } from '../components/ClickFeedback/status-region';
import ThemeToggle from '../components/ThemeToggle';
import { impersonationEnabled } from '../lib/impersonation';
import { SITE_NAME, SITE_ORIGIN } from '../lib/site';
import CatalogLink from './catalog-link';
import { body, display } from './fonts';
import ImpersonationBannerSlot from './impersonation-banner';
import PrePaintScripts from './pre-paint-scripts';
import Providers from './providers';
import './globals.scss';

// `metadataBase` resolves any relative address a page's metadata names against the production origin,
// and the template puts the site's name after every page's own title, so a page sets only what is
// particular to it.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: 'A compendium, ingredient store and grimoire.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // CSS variables rather than className: the Sass stacks read --font-* document-wide.
  // suppressHydrationWarning on <html> alone, the one element the theme script mutates.
  // data-scroll-behavior="smooth" tells Next the page smooth-scrolls (globals.scss), so
  // it switches that off for its own jump to the top on a route change; without it the
  // jump glides and stops part-way down (claude-docs/styling.md, "Smooth scrolling").
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <CatalogLink />
        <PrePaintScripts />
      </head>
      <body>
        {/* First, above what it describes; mounted only where impersonation is
            registered, so production pays nothing for it. */}
        {impersonationEnabled() && <ImpersonationBannerSlot />}
        {/* Every page gets it, signed in or not. */}
        <ThemeToggle />
        {/* The page's one status region, its <output> drawn ahead of the page so
            a screen reader is listening before a click says anything
            (claude-docs/components/click-feedback.md). Around the page alone:
            the toggle and backdrop query nothing and say nothing. */}
        <StatusRegionProvider>
          <Providers>{children}</Providers>
        </StatusRegionProvider>
        {/* Last, so it never precedes the page in reading order even for a
            tool that ignores aria-hidden. */}
        <Backdrop />
      </body>
    </html>
  );
}

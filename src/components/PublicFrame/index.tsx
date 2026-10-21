import Link from 'next/link';
import type { ReactElement } from 'react';
import ThemeToggle from '../ThemeToggle';
import PublicNav from './public-nav';
import type { PublicFrameProps } from './types';
import './index.scss';

// The frame round a public page for a visitor who is not signed in (MB.83):
// a skip link, the site name, a nav holding the Compendium and the way in, and
// the page in `main`, after the skip link's target. Nothing workspace-shaped.
// A signed-in visitor gets `AppShell` from the same layout instead
// (`src/app/(public)/layout.tsx`). `.skip-link` and `.skip-target` are
// drawn by AppShell's stylesheet, which the layout always loads with it. A
// server component; its nav is the one client part (`public-nav.tsx`, which
// marks the current page), and renders on the server too, so the chrome is in
// the HTML a crawler or a script-less browser receives.
// See claude-docs/components/public-frame.md.

const PublicFrame = ({ children }: PublicFrameProps): ReactElement => (
  <div className="public-frame">
    <a className="skip-link" href="#main">
      Skip to Content
    </a>
    <header className="public-frame__bar">
      <div className="public-frame__bar-inner">
        <Link href="/" className="public-frame__brand">
          <span className="public-frame__brand-full">Sorrel &amp; Salt</span>
          {/* The initials stand in on a narrow phone; the name above stays for a
              screen reader, which is why this one is hidden from it. */}
          <span className="public-frame__brand-short" aria-hidden="true">
            S&amp;S
          </span>
        </Link>
        <PublicNav />
        <div className="public-frame__end">
          <Link className="btn btn--solid btn--medium" href="/sign-in">
            Sign In
          </Link>
          <ThemeToggle variant="inline" />
        </div>
      </div>
    </header>
    {/* The skip link's target, as the shell's is: an empty span before the
        page, focusable by script only, so the link moves focus here and the
        next Tab reaches the page's first control. Not the `main`: a focusable
        `main` would take the focus from every click on plain text in the
        page, and the next Tab would restart at its top. */}
    <span id="main" className="skip-target" tabIndex={-1} />
    <main>{children}</main>
  </div>
);

export default PublicFrame;

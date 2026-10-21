import Link from 'next/link';
import type { ReactElement } from 'react';
import MainBody from '../AppShell/main-body';
import ThemeToggle from '../ThemeToggle';
import PublicNav from './public-nav';
import type { PublicFrameProps } from './types';
import './index.scss';

// The frame round a public page for a visitor who is not signed in (MB.83):
// a skip link, the site name, a nav holding the Compendium and the way in, and
// the page in `#main`. Nothing workspace-shaped. A signed-in visitor gets
// `AppShell` from the same layout instead (`src/app/(public)/layout.tsx`).
// `.skip-link` is drawn by AppShell's stylesheet, which the layout always
// loads with it. A server component; its nav is the one client part
// (`public-nav.tsx`, which marks the current page), and renders on the server
// too, so the chrome is in the HTML a crawler or a script-less browser receives.
// The body is the shell's `MainBody` (M12.47), so a move between public pages
// draws the destination's skeleton under the bar as the shell does.
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
    {/* The skip link's target: a wrapper, as the shell's is, not the `main`
        itself, since the layout's `main` gives way to the skeleton's own during
        a wait, and a `main` here would nest the two. Focusable by script only,
        so the link moves focus here. */}
    <div id="main" className="public-frame__main" tabIndex={-1}>
      <MainBody>{children}</MainBody>
    </div>
  </div>
);

export default PublicFrame;

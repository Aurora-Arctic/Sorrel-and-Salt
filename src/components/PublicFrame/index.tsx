import Link from 'next/link';
import type { ReactElement } from 'react';
import BrandName from '../AppShell/brand-name';
import MainBody from '../AppShell/main-body';
import ThemeToggle from '../ThemeToggle';
import PublicNav from './public-nav';
import type { PublicFrameProps } from './types';
import './index.scss';

// The frame round a public page for a visitor who is not signed in (MB.83):
// a skip link, the site name, a nav holding the Compendium and the way in, and
// the page in a wrapper after the skip link's target. Nothing workspace-shaped.
// A signed-in visitor gets `AppShell` from the same layout instead
// (`src/app/(public)/layout.tsx`). `.skip-link` and `.skip-target` are
// drawn by AppShell's stylesheet, which the layout always loads with it. A
// server component; its nav is the one client part (`public-nav.tsx`, which
// marks the current page), and renders on the server too, so the chrome is in
// the HTML a crawler or a script-less browser receives.
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
          <BrandName block="public-frame" />
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
        next Tab reaches the page's first control. Not the wrapper below: a
        click on plain text focuses the nearest focusable ancestor, so a
        focusable wrapper would take every such click, and the next Tab would
        restart at the top of the page. The page sits in a wrapper rather than
        a `main` because the layout's `main` gives way to the skeleton's own
        during a wait, and a `main` here would nest the two. */}
    <span id="main" className="skip-target" tabIndex={-1} />
    <div className="public-frame__main">
      <MainBody>{children}</MainBody>
    </div>
  </div>
);

export default PublicFrame;

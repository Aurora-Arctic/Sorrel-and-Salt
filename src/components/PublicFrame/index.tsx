import Link from 'next/link';
import type { ReactElement } from 'react';
import BrandName from '../AppShell/brand-name';
import MainBody from '../AppShell/main-body';
import { PendingLink } from '../../lib/navigation';
import ThemeToggle from '../ThemeToggle';
import SiteFooter from '../SiteFooter';
import SiteNav from '../AppShell/site-nav';
import type { SiteLink } from '../AppShell/types';
import type { PublicFrameProps } from './types';
import '../AppShell/index.scss';
import './index.scss';

// The frame round a public page for a signed-out visitor: skip link, site name, a nav of the
// Compendium and the way in, and the page; a signed-in visitor gets `AppShell` instead. A server
// component whose nav is the shell's `SiteNav`, so the chrome is in the HTML a crawler receives;
// the body is the shell's `MainBody`. claude-docs/components/public-frame.md.

// The one link the public bar holds; the shell's `SiteNav` draws it.
const COMPENDIUM_LINK: readonly SiteLink[] = [
  { label: 'Compendium', href: '/compendium', base: '/compendium' },
];

const PublicFrame = ({ children }: PublicFrameProps): ReactElement => (
  <div className="public-frame">
    <a className="skip-link" href="#main">
      Skip to Content
    </a>
    <header className="public-frame__bar">
      <div className="public-frame__bar-inner">
        <PendingLink
          href="/"
          className="public-frame__brand"
          navigationTarget={{ region: 'main', shape: 'page' }}
        >
          <BrandName block="public-frame" />
        </PendingLink>
        <SiteNav links={COMPENDIUM_LINK} />
        <div className="public-frame__end">
          <Link className="btn btn--solid btn--medium" href="/sign-in">
            Sign In
          </Link>
          {/* The shell’s wrapper (AppShell/index.scss). */}
          <span className="app-shell__theme">
            <ThemeToggle variant="inline" />
          </span>
        </div>
      </div>
    </header>
    {/* The skip link's target, as the shell's is: an empty span before the page, focusable by
            script only, so the link moves focus here and the next Tab reaches the page's first
            control. Not the wrapper below: a click on plain text focuses the nearest focusable
            ancestor, so a focusable wrapper would take every such click, and the next Tab would
            restart at the top of the page. The page sits in a wrapper rather than a `main`
            because the layout's `main` gives way to the skeleton's own during a wait, and a
            `main` here would nest the two. */}
    <span id="main" className="skip-target" tabIndex={-1} />
    <div className="app-shell__main">
      <MainBody>{children}</MainBody>
    </div>
    <SiteFooter />
  </div>
);

export default PublicFrame;

import Link from 'next/link';
import type { ReactElement } from 'react';
import { covenHome, shellHome } from '../../lib/shell-home';
import AccountMenu from '../AccountMenu';
import ThemeToggle from '../ThemeToggle';
import SiteNav from './site-nav';
import type { AppShellProps, SiteLink } from './types';
import './index.scss';

// The frame around every signed-in page (MB.7): a skip link, the global bar,
// and the page. The context row (the coven's switcher or "Admin", beside the
// section nav) is the layouts' to render, since only they know which area the
// page is in. A server component: it reads nothing itself, the viewer and
// their covens come in as props from `src/app/(shell)/layout.tsx`, and only
// the account menu and the current-page marking are client code.
// See claude-docs/components/app-shell.md.

const BRAND = 'Sorrel & Salt';

const AppShell = ({ viewer, workspaces, children }: AppShellProps): ReactElement => {
  // No Compendium link yet: its public route is MB.80's. When it lands it is
  // the first entry here, for everyone, and the nav stops being admin-only.
  const links: SiteLink[] = viewer.isAdmin
    ? [
        {
          label: 'Your Coven',
          href: covenHome(workspaces),
          base: '/coven',
        },
        { label: 'Admin', href: '/admin', base: '/admin' },
      ]
    : [];
  const brand = (
    <>
      <span className="app-shell__brand-full">{BRAND}</span>
      {/* The initials stand in at a phone's width; the full name above stays
          for a screen reader, which is why this one is hidden from it. */}
      <span className="app-shell__brand-short" aria-hidden="true">
        S&amp;S
      </span>
    </>
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to Content
      </a>
      <header className="app-shell__bar">
        <div className="app-shell__bar-inner">
          {/* Plain text while the address is unverified: every page the
              brand could lead to would send the viewer back to the email page. */}
          {viewer.verified ? (
            <Link href={shellHome(viewer, workspaces)} className="app-shell__brand">
              {brand}
            </Link>
          ) : (
            <span className="app-shell__brand">{brand}</span>
          )}
          {viewer.verified && links.length > 0 && <SiteNav links={links} />}
          <div className="app-shell__end">
            {/* The shell's one global action. Disabled until M8.16 builds the
                form. Its target follows the area when it does: a coven page adds
                to that coven, an admin page to the compendium, anywhere else to
                the viewer's only coven or a choice among them. */}
            {viewer.verified && (
              <button type="button" className="btn app-shell__add" disabled>
                Add Ingredient
              </button>
            )}
            <AccountMenu
              name={viewer.name}
              verified={viewer.verified}
              links={links}
              pendingInvitations={viewer.pendingInvitations}
            />
            {/* In the bar at every width (the owner's call, M10.32). */}
            <span className="app-shell__theme">
              <ThemeToggle variant="inline" />
            </span>
          </div>
        </div>
      </header>
      {/* The skip link's target: a wrapper, since the page inside owns its
          own `main` and there is no one place a page could be asked to put an
          id. Focusable by script only, so the link moves focus here. */}
      <div id="main" className="app-shell__main" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
};

export default AppShell;

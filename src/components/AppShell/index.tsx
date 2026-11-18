import { PendingLink } from '../../lib/navigation';
import type { ReactElement } from 'react';
import { covenHome } from '../../lib/shell-home';
import { ViewerIdProvider } from '../../lib/viewer-id';
import BrandName from './brand-name';
import { COMPENDIUM_LINK } from './compendium-link';
import MainBody from './main-body';
import PausedNotice from './paused-notice';
import ShellEnd from './shell-end';
import SiteNav from './site-nav';
import type { AppShellProps, SiteLink } from './types';
import './index.scss';

// The frame around every signed-in page: a skip link, the global bar and the page. The layouts render
// the context row, as only they know the area. A server component: only the bar's end block and the
// current-page marking are client code (claude-docs/components/app-shell.md).

const AppShell = ({ viewer, workspaces, children }: AppShellProps): ReactElement => {
  // The Compendium is public, so its link is everyone's, an unverified account's included. Your Coven is a
  // verified account's who belongs to a coven or curates (a curator or keeper in none is sent to /coven).
  // Curator and Keepers are a verified curator's or admin's alone.
  const curates = viewer.verified && viewer.canCurate;
  const links: SiteLink[] = [COMPENDIUM_LINK];
  if (viewer.verified && (workspaces.length > 0 || viewer.canCurate)) {
    links.push({
      label: workspaces.length > 1 ? 'Your Covens' : 'Your Coven',
      href: covenHome(workspaces),
      base: '/coven',
    });
  }
  if (curates) {
    links.push({ label: 'Curator', href: '/curator', base: '/curator' });
    links.push({ label: 'Keepers', href: '/keepers', base: '/keepers' });
  }
  const brand = <BrandName block="app-shell" />;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to Content
      </a>
      <header className="app-shell__bar">
        <div className="app-shell__bar-inner">
          {/* The brand leads to `/`, which is public, so every viewer gets the link,
              an unverified one included. */}
          <PendingLink href="/" className="app-shell__brand">
            {brand}
          </PendingLink>
          <SiteNav links={links} />
          <ShellEnd viewer={viewer} workspaces={workspaces} links={links} />
        </div>
      </header>
      {/* The skip link's target: an empty span just before the page, which owns
          its own `main`, so there is no one element a page could be asked to
          name. It is focusable by script only (tabIndex -1), so the link moves
          focus here and the next Tab reaches the page's first control. It is
          not the wrapper below: a click on plain text focuses the nearest
          focusable ancestor, so a focusable wrapper would take every such
          click, and the next Tab would restart at the top of the page. */}
      <span id="main" className="skip-target" tabIndex={-1} />
      <div className="app-shell__main">
        {/* A paused viewer is told so on every page they reach. */}
        {viewer.accessPause && (
          <PausedNotice until={viewer.accessPause.until} className="app-shell__pause" />
        )}
        <ViewerIdProvider id={viewer.id}>
          <MainBody>{children}</MainBody>
        </ViewerIdProvider>
      </div>
    </div>
  );
};

export default AppShell;

import { PendingLink } from '../../lib/navigation';
import type { ReactElement } from 'react';
import { covenHome } from '../../lib/shell-home';
import AccountMenu from '../AccountMenu';
import ThemeToggle from '../ThemeToggle';
import AddIngredientButton from './add-ingredient-button';
import BrandName from './brand-name';
import MainBody from './main-body';
import NewSpellElsewhere from './new-spell-elsewhere';
import SiteNav from './site-nav';
import type { AppShellProps, SiteLink } from './types';
import './index.scss';

// The frame around every signed-in page: a skip link, the global bar and the page. The layouts render
// the context row, as only they know the area. A server component: only the account menu and the
// current-page marking are client code (claude-docs/components/app-shell.md).

const AppShell = ({ viewer, workspaces, children }: AppShellProps): ReactElement => {
  // The Compendium is public, so its link is everyone's, an unverified account's
  // included: it leads to a page that never sends them to the email page. The other
  // two are for a verified curator or admin.
  const compendium: SiteLink = { label: 'Compendium', href: '/compendium', base: '/compendium' };
  const links: SiteLink[] =
    viewer.verified && viewer.canCurate
      ? [
          compendium,
          {
            label: workspaces.length > 1 ? 'Your Covens' : 'Your Coven',
            href: covenHome(workspaces),
            base: '/coven',
          },
          { label: 'Admin', href: '/admin', base: '/admin' },
        ]
      : [compendium];
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
          <PendingLink
            href="/"
            className="app-shell__brand"
            navigationTarget={{ region: 'main', shape: 'page' }}
          >
            {brand}
          </PendingLink>
          <SiteNav links={links} />
          <div className="app-shell__end">
            {/* The shell’s one global action; its target follows the area (add-ingredient-button.tsx). */}
            <AddIngredientButton viewer={viewer} workspaces={workspaces} />
            <NewSpellElsewhere />
            <AccountMenu
              name={viewer.name}
              verified={viewer.verified}
              links={links}
              pendingInvitations={viewer.pendingInvitations}
            />
            {/* In the bar at every width. */}
            <span className="app-shell__theme">
              <ThemeToggle variant="inline" />
            </span>
          </div>
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
        <MainBody>{children}</MainBody>
      </div>
    </div>
  );
};

export default AppShell;

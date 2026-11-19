import type { ReactElement } from 'react';
import BrandName from '../AppShell/brand-name';
import MainBody from '../AppShell/main-body';
import { PendingLink } from '../../lib/navigation';
import PublicEnd from './public-end';
import SiteNav from '../AppShell/site-nav';
import { COMPENDIUM_LINK } from '../AppShell/compendium-link';
import type { PublicFrameProps } from './types';
import '../AppShell/index.scss';
import './index.scss';

// A server component, so the nav is in the HTML a crawler receives (claude-docs/components/public-frame.md).

const NAV_LINKS = [COMPENDIUM_LINK];

const PublicFrame = ({ configured, children }: PublicFrameProps): ReactElement => (
  <div className="public-frame">
    <a className="skip-link" href="#main">
      Skip to Content
    </a>
    <header className="public-frame__bar">
      <div className="public-frame__bar-inner">
        <PendingLink href="/" className="public-frame__brand">
          <BrandName block="public-frame" />
        </PendingLink>
        <SiteNav links={NAV_LINKS} />
        <PublicEnd configured={configured} links={NAV_LINKS} />
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
  </div>
);

export default PublicFrame;

import Link from 'next/link';
import type { ReactElement } from 'react';
import { SITE_NAME, SITE_TAGLINE } from '../../lib/site';
import IconTip from '../IconTip/icon-tip';
import { SupportIcon } from '../IconTip/icons';
import SupportLink from '../SupportLink';
import './index.scss';

// The row under every page, drawn once by the root layout: the site's name at the left,
// the footer's links at the right. Support is the only link, drawn as a bare icon button;
// later links join the nav here
// (claude-docs/components/site-footer.md).

const SiteFooter = (): ReactElement => (
  <footer className="site-footer">
    <div className="site-footer__inner">
      <div className="site-footer__row">
        <Link href="/" className="site-footer__brand">
          {SITE_NAME}
        </Link>
        <nav aria-label="Footer" className="site-footer__nav">
          <IconTip tip="Support">
            <SupportLink className="site-footer__support">
              <SupportIcon />
              <span className="visually-hidden">Support</span>
            </SupportLink>
          </IconTip>
        </nav>
      </div>
      <p className="site-footer__tagline">{SITE_TAGLINE}</p>
    </div>
  </footer>
);

export default SiteFooter;

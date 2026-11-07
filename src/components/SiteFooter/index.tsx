import type { ReactElement } from 'react';
import { SITE_NAME, SITE_TAGLINE } from '../../lib/site';
import IconTip from '../IconTip/icon-tip';
import { SupportIcon } from '../IconTip/icons';
import SupportLink from '../SupportLink';
import './index.scss';
import { PendingLink } from '../../lib/navigation';

// See claude-docs/components/site-footer.md.

const SiteFooter = (): ReactElement => (
  <footer className="site-footer">
    <div className="site-footer__inner">
      <div className="site-footer__row">
        <PendingLink href="/" className="site-footer__brand">
          {SITE_NAME}
        </PendingLink>
        <nav aria-label="Footer" className="site-footer__nav">
          <PendingLink href="/terms" className="site-footer__link">
            Terms
          </PendingLink>
          <PendingLink href="/disclaimer" className="site-footer__link">
            Disclaimer
          </PendingLink>
          <PendingLink href="/code-of-ethics" className="site-footer__link">
            Code of Ethics
          </PendingLink>
          <PendingLink href="/privacy" className="site-footer__link">
            Privacy
          </PendingLink>
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

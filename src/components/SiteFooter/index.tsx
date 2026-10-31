import Link from 'next/link';
import type { ReactElement } from 'react';
import { SITE_NAME } from '../../lib/site';
import SupportLink from '../SupportLink';
import './index.scss';

// The row under every page in both frames, the shell's and the public one's: the site's name at the left,
// the footer's links at the right. Support is the only link; later links join the nav here
// (claude-docs/components/site-footer.md).

const SiteFooter = ({ inShell = false }: { inShell?: boolean }): ReactElement => (
  <footer className="site-footer">
    <div className="site-footer__inner">
      <Link href="/" className="site-footer__brand">
        {SITE_NAME}
      </Link>
      <nav aria-label="Footer" className="site-footer__nav">
        <SupportLink plain={!inShell}>Support</SupportLink>
      </nav>
    </div>
  </footer>
);

export default SiteFooter;

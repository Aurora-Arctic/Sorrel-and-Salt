import Link from 'next/link';
import type { ReactElement } from 'react';
import { SUPPORT_PATH } from '../../lib/support-path';
import './index.scss';

// The line under every page in both frames, the shell's and the public one's. Holds the Support link
// and nothing else (claude-docs/components/site-footer.md).

const SiteFooter = (): ReactElement => (
  <footer className="site-footer">
    <nav aria-label="Footer" className="site-footer__nav">
      <Link href={SUPPORT_PATH}>Support</Link>
    </nav>
  </footer>
);

export default SiteFooter;

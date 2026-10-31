import type { ReactElement } from 'react';
import SupportLink from '../SupportLink';
import './index.scss';

// The line under every page in both frames, the shell's and the public one's. Holds the Support link
// and nothing else: in the shell it opens the dialog over the page, in the public frame it goes to
// the support page (claude-docs/components/site-footer.md).

const SiteFooter = ({ inShell = false }: { inShell?: boolean }): ReactElement => (
  <footer className="site-footer">
    <nav aria-label="Footer" className="site-footer__nav">
      <SupportLink plain={!inShell}>Support</SupportLink>
    </nav>
  </footer>
);

export default SiteFooter;

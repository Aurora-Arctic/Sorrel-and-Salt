'use client';

import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';
import { isAtPath } from '../../lib/at-path';
import { PendingLink } from '../../lib/navigation';
import { siteLinkTarget } from '../AppShell/site-target';

// The frame's nav, the one part of it that has to know which page is open, and
// so a client part, as the shell's `SiteNav` is: only `usePathname()` reads the
// address. It still renders on the server, so the mark is in the HTML a
// crawler or a script-less browser receives. Current is `aria-current="page"`,
// which the stylesheet draws as weight and a rule, not a colour alone. The
// link answers a press with the page bar and the Compendium's cards in the
// frame's body (M12.47), the target the shell's Compendium link takes.
// See claude-docs/components/public-frame.md.

const PublicNav = (): ReactElement => {
  const pathname = usePathname();
  return (
    <nav aria-label="Site" className="public-frame__nav">
      <ul>
        <li>
          <PendingLink
            href="/compendium"
            navigationTarget={siteLinkTarget('/compendium')}
            aria-current={isAtPath(pathname, '/compendium') ? 'page' : undefined}
          >
            Compendium
          </PendingLink>
        </li>
      </ul>
    </nav>
  );
};

export default PublicNav;

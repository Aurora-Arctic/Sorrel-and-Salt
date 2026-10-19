'use client';

import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';
import { isAtPath } from '../../lib/at-path';
import { PendingLink } from '../../lib/navigation';
import { siteLinkTarget } from './site-target';
import type { SiteNavProps } from './types';

// The bar's links, the one part of the shell that has to know which page is
// open, and so a client part, as the section navs' links are: only
// `usePathname()` reads the address (claude-docs/components/app-shell.md).
// Current is `aria-current="page"`, which the stylesheet draws as weight and
// a rule, not as a colour alone. Each link answers a press with the page bar
// and the shell's skeleton (M12.33); the Compendium opens on its cards, the
// others on a page.

const SiteNav = ({ links }: SiteNavProps): ReactElement => {
  const pathname = usePathname();
  return (
    <nav aria-label="Site" className="app-shell__nav">
      <ul>
        {links.map(({ label, href, base }) => (
          <li key={label}>
            <PendingLink
              href={href}
              navigationTarget={siteLinkTarget(base, href)}
              aria-current={isAtPath(pathname, base) ? 'page' : undefined}
            >
              {label}
            </PendingLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SiteNav;

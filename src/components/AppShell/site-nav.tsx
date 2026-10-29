'use client';

import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';
import { isAtPath } from '../../lib/at-path';
import { PendingLink } from '../../lib/navigation';
import { siteLinkTarget } from './site-target';
import type { SiteNavProps } from './types';

// The bar's links, a client part since only `usePathname()` reads the address. Current is
// `aria-current="page"`, drawn as weight and a rule, not colour alone. A press answers with the page
// bar and the shell's skeleton (claude-docs/components/app-shell.md).

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

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';
import { isAtPath } from '../../lib/at-path';
import type { SiteNavProps } from './types';

// The bar's links, the one part of the shell that has to know which page is
// open, and so a client part, as the section navs' links are: only
// `usePathname()` reads the address (claude-docs/components/app-shell.md).
// Current is `aria-current="page"`, which the stylesheet draws as weight and
// a rule, not as a colour alone.

const SiteNav = ({ links }: SiteNavProps): ReactElement => {
  const pathname = usePathname();
  return (
    <nav aria-label="Site" className="app-shell__nav">
      <ul>
        {links.map(({ label, href, base }) => (
          <li key={label}>
            <Link href={href} aria-current={isAtPath(pathname, base) ? 'page' : undefined}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SiteNav;

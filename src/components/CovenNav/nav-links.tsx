'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';
import { isAtPath } from '../../lib/at-path';
import type { CovenSection, NavLinksProps } from './types';

// The nav's links, the one part that has to know which page is open, and so
// the one client part: only `usePathname()` reads the address
// (claude-docs/components/coven-nav.md).

// The index is the ancestor of every coven page, so it is current only at its
// own address; `isAtPath` would mark it current everywhere. Every other
// section link uses `isAtPath`, so it is current on the pages beneath it too.
const isCurrent = (pathname: string, { href, exact }: CovenSection): boolean =>
  exact ? pathname === href : isAtPath(pathname, href);

const NavLinks = ({ sections }: NavLinksProps): ReactElement => {
  const pathname = usePathname();
  return (
    <ul className="link-row">
      {sections.map((section) => (
        <li key={section.label}>
          <Link
            href={section.href}
            aria-current={isCurrent(pathname, section) ? 'page' : undefined}
          >
            {section.label}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default NavLinks;

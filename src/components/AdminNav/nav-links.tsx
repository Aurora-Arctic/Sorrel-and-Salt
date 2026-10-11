'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';
import type { NavLinksProps } from './types';

// The nav's links, the one part that has to know which page is open, and so
// the one client part: only `usePathname()` reads the address, and only in a
// client component (claude-docs/components/admin-nav.md).

// A link is current on its own page and on any address beneath it, but not on
// a page whose path merely begins with its letters: a later
// `/admin/forms-archive` must not mark Forms. Hence the slash, rather than a
// bare `startsWith(href)`.
const isCurrent = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

const NavLinks = ({ resources }: NavLinksProps): ReactElement => {
  const pathname = usePathname();

  return (
    // The `.link-row` primitive: a row of links, not a bulleted list. It draws
    // the current link by weight and a heavy underline (claude-docs/styling.md,
    // "Link rows and provider marks").
    <ul className="link-row">
      {resources.map(({ href, label }) => (
        <li key={href}>
          {/* Every route is built, so typed routes accept each (M5.6b). */}
          <Link href={href} aria-current={isCurrent(pathname, href) ? 'page' : undefined}>
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default NavLinks;

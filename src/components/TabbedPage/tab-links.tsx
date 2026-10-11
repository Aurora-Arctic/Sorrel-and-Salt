'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';
import { isAtPath } from '../../lib/at-path';
import type { TabLinksProps } from './types';

// The tabs' links, the part that has to know which tab is open, and so the
// one client part: only `usePathname()` reads the address
// (claude-docs/components/tabbed-page.md).

/**
 * A spinner beside a tab that was pressed and has not yet moved the address,
 * which happens only when its loading state was not fetched ahead (Next's
 * `useLinkStatus`): once the address moves, the tab is marked open and the
 * panel shows its loading state instead. Out of the flow, so no label moves.
 */
const PendingMark = (): ReactElement | null => {
  const { pending } = useLinkStatus();
  return pending ? <span className="spinner tabbed-page__pending" aria-hidden="true" /> : null;
};

const TabLinks = ({ tabs }: TabLinksProps): ReactElement => {
  const pathname = usePathname();
  return (
    <ul className="link-row tabbed-page__row">
      {tabs.map(({ href, label }) => (
        <li key={href}>
          <Link href={href} aria-current={isAtPath(pathname, href) ? 'page' : undefined}>
            {label}
            <PendingMark />
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default TabLinks;

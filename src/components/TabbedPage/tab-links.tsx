'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MouseEvent, ReactElement } from 'react';
import { isAtPath } from '../../lib/at-path';
import { opensElsewhere } from '../../lib/opens-elsewhere';
import { useTabSwitch } from './tab-switch';
import type { TabLinksProps } from './types';

// The tabs' links, the part that has to know which tab is open, and so a
// client part: only `usePathname()` reads the address
// (claude-docs/components/tabbed-page.md).
//
// Pressing another tab runs its navigation through the tab switch, which
// greys the row and shows the panel's loading state until the tab has
// rendered, as the pager's soft ends do. A Ctrl, Cmd or Shift click and a
// middle click keep the browser's own behaviour, and without JavaScript each
// tab is a plain link. The open tab is left to Link, so pressing it again
// shows no loading state. While a tab is on its way every tab is
// `aria-disabled` and a press does nothing; the row is `aria-busy` rather
// than the panel, whose status a screen reader should hear as it arrives,
// not hold back.
const TabLinks = ({ tabs }: TabLinksProps): ReactElement => {
  const pathname = usePathname();
  const { pending, go } = useTabSwitch();
  return (
    <ul className="link-row tabbed-page__row" aria-busy={pending || undefined}>
      {tabs.map(({ href, label }) => {
        const open = isAtPath(pathname, href);
        const press = (event: MouseEvent<HTMLAnchorElement>) => {
          if (pending) {
            event.preventDefault();
            return;
          }
          if (open || opensElsewhere(event)) return;
          event.preventDefault();
          go(href);
        };
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={open ? 'page' : undefined}
              aria-disabled={pending || undefined}
              onClick={press}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export default TabLinks;

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type MouseEvent, type ReactElement, useLayoutEffect, useRef } from 'react';
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
//
// A row too wide for its column scrolls sideways inside its track (the
// stylesheet). When the page loads and when a tab opens, the open tab is
// centred in the track, so it is in view with a neighbour either side. The
// track's own `scrollLeft` is set rather than `scrollIntoView()` called,
// which would scroll the page too. A focus moving along the row is the
// browser's to scroll into view.
const TabLinks = ({ tabs }: TabLinksProps): ReactElement => {
  const pathname = usePathname();
  const { pending, go } = useTabSwitch();
  const track = useRef<HTMLUListElement>(null);
  const openHref = tabs.find(({ href }) => isAtPath(pathname, href))?.href;
  useLayoutEffect(() => {
    const row = track.current;
    const link = row?.querySelector('[aria-current="page"]');
    if (!row || !link) return;
    const box = row.getBoundingClientRect();
    const tab = link.getBoundingClientRect();
    row.scrollLeft += tab.left + tab.width / 2 - (box.left + row.clientLeft + row.clientWidth / 2);
  }, [openHref]);
  return (
    <ul ref={track} className="tabbed-page__row" aria-busy={pending || undefined}>
      {tabs.map((tab) => {
        const { href, label } = tab;
        const open = href === openHref;
        const press = (event: MouseEvent<HTMLAnchorElement>) => {
          if (pending) {
            event.preventDefault();
            return;
          }
          if (open || opensElsewhere(event)) return;
          event.preventDefault();
          go(tab);
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

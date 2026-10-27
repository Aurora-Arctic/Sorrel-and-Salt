'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type MouseEvent, type ReactElement, useLayoutEffect, useRef } from 'react';
import { isAtPath } from '../../lib/at-path';
import { opensElsewhere } from '../../lib/opens-elsewhere';
import { pressFeedback } from '../../lib/press-feedback';
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
// not hold back, and so is the pressed tab. `aria-current` stays on the tab
// that is open until the new tab renders, since it names the page shown,
// not the press.
//
// The pill that marks a tab is one element sliding beneath the links (the
// owner's call): on the open tab, and from a press on the pressed one, in
// its pending look, so it reads as on its way rather than arrived. Should
// the navigation fail it slides back. The server draws the pill on the open
// link itself (the stylesheet), so it is there before this script runs and
// without it; once the sliding pill is placed, the row's `data-sliding`
// hands the drawing over to it.
//
// A row too wide for its column scrolls sideways inside its track (the
// stylesheet). When the page loads and when the pill moves, its tab is
// centred in the track, so it is in view with a neighbour either side. The
// track's own `scrollLeft` is set rather than `scrollIntoView()` called,
// which would scroll the page too. A focus moving along the row is the
// browser's to scroll into view.
const TabLinks = ({ tabs }: TabLinksProps): ReactElement => {
  const pathname = usePathname();
  const { pending, target, go } = useTabSwitch();
  const track = useRef<HTMLUListElement>(null);
  const pill = useRef<HTMLLIElement>(null);
  // The open tab is the most specific one at the address, the longest: the grimoire's Drafts
  // lies beneath Spells, so on Drafts both are at it, and the first would mark Spells.
  const openHref = tabs
    .filter(({ href }) => isAtPath(pathname, href))
    .reduce<string | undefined>(
      (best, { href }) => (best === undefined || href.length > best.length ? href : best),
      undefined,
    );
  const pressedHref = pending ? target?.href : undefined;
  const marked = pressedHref ?? openHref;
  useLayoutEffect(() => {
    const row = track.current;
    const shape = pill.current;
    const link = [...(row?.querySelectorAll('a') ?? [])].find(
      (anchor) => anchor.getAttribute('href') === marked,
    );
    if (!row || !shape || !link) return;
    const place = () => {
      shape.style.width = `${link.offsetWidth}px`;
      shape.style.height = `${link.offsetHeight}px`;
      shape.style.transform = `translate(${link.offsetLeft}px, ${link.offsetTop}px)`;
      const box = row.getBoundingClientRect();
      const tab = link.getBoundingClientRect();
      row.scrollLeft +=
        tab.left + tab.width / 2 - (box.left + row.clientLeft + row.clientWidth / 2);
      // Placed before the slide is switched on, so the first placing does
      // not slide in from the row's start; reading a size settles it first.
      if (!row.hasAttribute('data-sliding')) {
        void shape.offsetWidth;
        row.setAttribute('data-sliding', '');
      }
    };
    place();
    // Again whenever its tab or the track changes size: the web font
    // arriving after the first paint widens every label, and a phone turned
    // on its side widens the track.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(place);
    observer.observe(row);
    observer.observe(link);
    return () => observer.disconnect();
  }, [marked]);
  return (
    <ul ref={track} className="tabbed-page__row" aria-busy={pending || undefined}>
      <li ref={pill} className="tabbed-page__pill" aria-hidden="true" />
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
              aria-busy={href === pressedHref || undefined}
              onClick={press}
              {...pressFeedback}
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

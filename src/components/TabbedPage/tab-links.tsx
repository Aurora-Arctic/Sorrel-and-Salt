'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type MouseEvent, type ReactElement, useLayoutEffect, useRef } from 'react';
import { isAtPath } from '../../lib/at-path';
import { opensElsewhere } from '../../lib/opens-elsewhere';
import { pressFeedback } from '../../lib/press-feedback';
import { useTabSwitch } from './tab-switch';
import type { TabLinksProps } from './types';

// The tabs' links: a client part because only `usePathname()` knows which tab is open. Pressing another tab navigates through the
// tab switch, and the sliding pill and scrolling are described in claude-docs/components/tabbed-page.md, "The sliding pill".
const TabLinks = ({ tabs }: TabLinksProps): ReactElement => {
  const pathname = usePathname();
  const { pending, target, go } = useTabSwitch();
  const track = useRef<HTMLUListElement>(null);
  const pill = useRef<HTMLLIElement>(null);
  // The open tab is the longest matching address: the grimoire's Drafts lies beneath Spells, so on Drafts both match.
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
      // Placed before the slide is switched on, so the first placing does not slide in from the row's start.
      if (!row.hasAttribute('data-sliding')) {
        void shape.offsetWidth;
        row.setAttribute('data-sliding', '');
      }
    };
    place();
    // Again whenever its tab or the track changes size, as a web font arriving or a phone turned on its side widens it.
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

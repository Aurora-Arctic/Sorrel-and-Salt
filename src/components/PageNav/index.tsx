'use client';

import { type ReactElement, useEffect, useId, useState } from 'react';
import type { PageNavEntry, PageNavItem, PageNavProps } from './types';
import './index.scss';

// A menu of jump links to a page's sections (claude-docs/components/page-nav.md). The anchors jump,
// so it works before the script loads; the script only moves `aria-current`. A group is set apart
// when its first entry is, as the entries are one flat array.

function itemsOf(entries: readonly PageNavEntry[]): PageNavItem[] {
  const items: PageNavItem[] = [];
  for (const entry of entries) {
    const last = items[items.length - 1];
    if (entry.group === undefined) items.push({ kind: 'entry', entry });
    else if (last?.kind === 'group' && last.label === entry.group) last.entries.push(entry);
    else items.push({ kind: 'group', label: entry.group, entries: [entry] });
  }
  return items;
}

export default function PageNav({ label, entries }: PageNavProps): ReactElement {
  const [current, setCurrent] = useState(entries[0]?.href);
  const groupId = useId();

  useEffect(() => {
    // No observer (an old browser): the server's mark stays.
    if (typeof IntersectionObserver === 'undefined') return;
    const targets = entries
      .map((entry) => document.getElementById(entry.href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    // Sections currently inside the band; the topmost one in page order wins.
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (changes) => {
        for (const change of changes) {
          if (change.isIntersecting) visible.add(change.target.id);
          else visible.delete(change.target.id);
        }
        const first = entries.find((entry) => visible.has(entry.href.slice(1)));
        if (first) setCurrent(first.href);
      },
      // A band across the upper part of the window: a section counts once its
      // top passes the shell's bar and until it is well below the middle.
      { rootMargin: '-20% 0px -60% 0px' },
    );
    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, [entries]);

  // `apart` is drawn by whatever stands at the top level: the entry's own item,
  // or for a group its item, never the entry again inside the group.
  const link = (entry: PageNavEntry, apart = entry.apart) => (
    <li key={entry.href} className={apart ? 'page-nav__apart' : undefined}>
      <a href={entry.href} aria-current={entry.href === current ? 'location' : undefined}>
        {entry.label}
      </a>
    </li>
  );

  // The entries stay one flat list for the observer above; only the drawing
  // nests a group, its label naming its list.
  return (
    <nav
      className={
        entries.some((entry) => entry.group !== undefined)
          ? 'page-nav page-nav--grouped'
          : 'page-nav'
      }
      aria-label={label}
    >
      <ul>
        {itemsOf(entries).map((item, at) =>
          item.kind === 'entry' ? (
            link(item.entry)
          ) : (
            <li
              key={`group-${at}`}
              className={item.entries[0]?.apart ? 'page-nav__apart' : undefined}
            >
              <span className="page-nav__group" id={`${groupId}-${at}`}>
                {item.label}
              </span>
              <ul aria-labelledby={`${groupId}-${at}`}>
                {item.entries.map((entry) => link(entry, false))}
              </ul>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

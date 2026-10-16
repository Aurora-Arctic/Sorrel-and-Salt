'use client';

import { type ReactElement, useEffect, useState } from 'react';
import type { PageNavProps } from './types';
import './index.scss';

// A menu of jump links to a page's own sections, marking the one in view
// (claude-docs/components/page-nav.md). The anchors do the jumping, so the
// menu works before the script loads; the script only moves `aria-current`.
// The server render marks the first entry.

export default function PageNav({ label, entries }: PageNavProps): ReactElement {
  const [current, setCurrent] = useState(entries[0]?.href);

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

  return (
    <nav className="page-nav" aria-label={label}>
      <ul>
        {entries.map((entry) => (
          <li key={entry.href}>
            <a href={entry.href} aria-current={entry.href === current ? 'location' : undefined}>
              {entry.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

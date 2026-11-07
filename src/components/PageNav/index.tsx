'use client';

import { type ReactElement, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { useHydrated } from '../../lib/hydrated';
import { useSlide } from '../../lib/use-slide';
import Skeleton from '../Skeleton';
import { ChevronIcon } from '../IconTip/icons';
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

// Wider than the phone (`$shell-phone-width`, 40rem; _variables.scss), where the menu stands open
// with no toggle; the server's snapshot is the phone's, closed, so the page lands with the text in view.
const TABLET_BAND = '(min-width: 40.01rem)';
const subscribeToBand = (notify: () => void): (() => void) => {
  if (typeof window.matchMedia !== 'function') return () => undefined;
  const query = window.matchMedia(TABLET_BAND);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
const inTabletBand = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia(TABLET_BAND).matches;
const inTabletBandNever = (): boolean => false;

export default function PageNav({
  label,
  entries,
  collapsible,
  pending,
}: PageNavProps): ReactElement {
  const [current, setCurrent] = useState(entries[0]?.href);
  const wide = useSyncExternalStore(subscribeToBand, inTabletBand, inTabletBandNever);
  const hydrated = useHydrated();
  const slide = useSlide('page-nav__slide');
  const groupId = useId();
  const nav = useRef<HTMLElement>(null);

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
        // An entry the width hides has no box, so it is never the current one.
        const shown = (entry: PageNavEntry) =>
          !entry.narrowOnly ||
          (nav.current?.querySelector(`a[href="${entry.href}"]`)?.getClientRects().length ?? 0) > 0;
        const first = entries.find((entry) => visible.has(entry.href.slice(1)) && shown(entry));
        if (first) setCurrent(first.href);
      },
      // A band across the upper part of the window: a section counts once its
      // top passes the shell's bar and until it is well below the middle.
      { rootMargin: '-20% 0px -60% 0px' },
    );
    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, [entries]);

  // Marks which ends of a scrolling menu hide entries, for the fades the page's stylesheet draws
  // there (DocumentPage); the marks are set on the element, not in state, so a scroll re-renders nothing.
  useEffect(() => {
    const el = nav.current;
    if (!el) return;
    let frame = 0;
    const mark = () => {
      frame = 0;
      const hidden = el.scrollHeight - el.clientHeight;
      el.toggleAttribute('data-more-above', el.scrollTop > 1);
      el.toggleAttribute('data-more-below', hidden - el.scrollTop > 1);
    };
    const queue = () => {
      if (frame === 0) frame = window.requestAnimationFrame(mark);
    };
    mark();
    el.addEventListener('scroll', queue, { passive: true });
    // No observer (an old browser): the marks follow scrolling alone.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(queue);
    observer?.observe(el);
    for (const child of Array.from(el.children)) observer?.observe(child);
    return () => {
      el.removeEventListener('scroll', queue);
      observer?.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [collapsible]);

  // `apart` is drawn by whatever stands at the top level: the entry's own item,
  // or for a group its item, never the entry again inside the group.
  const link = (entry: PageNavEntry, apart = entry.apart) => (
    <li
      key={entry.href}
      className={
        [apart && 'page-nav__apart', entry.narrowOnly && 'page-nav__narrow']
          .filter(Boolean)
          .join(' ') || undefined
      }
    >
      <a href={entry.href} aria-current={entry.href === current ? 'location' : undefined}>
        {entry.label}
      </a>
    </li>
  );

  // The entries stay one flat list for the observer above; only the drawing
  // nests a group, its label naming its list.
  const list = pending ? (
    <ul aria-hidden="true">
      {Array.from({ length: 6 }, (_, at) => (
        <li key={at}>
          <span className="page-nav__pending">
            <Skeleton shape="line" quiet />
          </span>
        </li>
      ))}
    </ul>
  ) : (
    <ul>
      {itemsOf(entries).map((item, at) =>
        item.kind === 'entry' ? (
          link(item.entry)
        ) : (
          <li
            key={`group-${at}`}
            className={
              [
                item.entries[0]?.apart && 'page-nav__apart',
                // A group of narrow-only entries is hidden whole, label included.
                item.entries.every((entry) => entry.narrowOnly) && 'page-nav__narrow',
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
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
  );

  return (
    <nav
      ref={nav}
      className={
        entries.some((entry) => entry.group !== undefined)
          ? 'page-nav page-nav--grouped'
          : 'page-nav'
      }
      aria-label={label}
    >
      {collapsible ? (
        <details
          className={`page-nav__fold${hydrated ? (slide.shown ? ' is-open' : '') : ' page-nav__fold--static'}`}
          open={hydrated ? wide || slide.state !== 'closed' : undefined}
        >
          <summary
            className="page-nav__summary"
            onClick={(event) => {
              // Once hydrated the slide owns the toggle, so a close can run before `open` is dropped.
              if (!hydrated) return;
              event.preventDefault();
              if (slide.shown) slide.close();
              else slide.open();
            }}
          >
            {label}
            <ChevronIcon className="page-nav__chevron" />
          </summary>
          <div
            className={`${slide.className}${hydrated ? '' : ' page-nav__slide--static'}`}
            style={slide.style}
            onTransitionEnd={slide.onTransitionEnd}
          >
            <div className="page-nav__slide-inner">{list}</div>
          </div>
        </details>
      ) : (
        list
      )}
    </nav>
  );
}

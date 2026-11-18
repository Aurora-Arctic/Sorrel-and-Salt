'use client';

import { PendingLink } from '../../lib/navigation';
import { TABLET_BAND, useMediaQuery } from '../../lib/use-media-query';
import { usePathname } from 'next/navigation';
import { type ReactElement, useId, useRef, useSyncExternalStore, useState } from 'react';
import { useDismiss } from '../../lib/use-dismiss';
import { useMeasuredFit } from '../../lib/use-measured-fit';
import { isAtPath } from '../../lib/at-path';
import { FacetCount } from '../FacetPanel/facet-count';
import { ChevronIcon } from '../IconTip/icons';
import SectionIcon from './icons';
import type { SectionNavItem, SectionNavProps } from './types';

// The nav itself, the one client part: `usePathname()`, the More button and the on-screen keyboard are browser state.
// The list is the server's, passed as plain data (claude-docs/components/section-nav.md).

// How many sections stay in view on a phone, and what the server and first client render show; the stylesheet's
// `--extra` class hides the rest, so the number lives here once.
const VISIBLE = 4;

const pixels = (value: string): number => Number.parseFloat(value) || 0;

type Natural = {
  widths: number[];
  // The first tab's own width, kept to tell a change of text size from a change of the row's width.
  first: number;
  gap: number;
  more: number;
};

const FIRST_TAB = ':scope > .section-nav__item:not(.section-nav__more)';

const measureNatural = (list: HTMLElement): Natural | null => {
  const items = Array.from(list.querySelectorAll<HTMLElement>(FIRST_TAB));
  const widths = items.map(
    (item) => item.offsetWidth + pixels(getComputedStyle(item).marginInlineStart),
  );
  // No layout (happy-dom, a hidden nav): there is nothing to fit, so keep the default.
  if (widths.length === 0 || widths.some((width) => width === 0)) return null;
  const more = list.querySelector<HTMLElement>(':scope > .section-nav__more');
  return {
    widths,
    first: items[0].offsetWidth,
    gap: pixels(getComputedStyle(list).columnGap),
    more: more?.offsetWidth ?? 0,
  };
};

// The most leading tabs, at least one, that fit `available` beside More. More is reserved at its
// own width, not the widest hidden tab's, which would hide one while room remains.
const countThatFit = ({ widths, gap, more }: Natural, available: number): number => {
  for (let count = widths.length; count > 1; count -= 1) {
    const tabs = widths.slice(0, count).reduce((sum, width) => sum + width, 0) + gap * (count - 1);
    if (tabs + (count < widths.length ? gap + more : 0) <= available) return count;
  }
  return 1;
};

const chooseCount = (natural: Natural, list: HTMLElement): number =>
  countThatFit(natural, list.clientWidth);

// A tab whose width no longer matches the measured one means the text size changed (the list's own width did not).
const textSizeChanged = (natural: Natural, list: HTMLElement): boolean => {
  const first = list.querySelector<HTMLElement>(FIRST_TAB);
  return first !== null && first.offsetWidth !== natural.first;
};

// A section is current at its own address and, unless `exact`, beneath it;
// `matches` adds the addresses of its other tabs.
const isCurrent = (pathname: string, { href, exact, matches = [] }: SectionNavItem): boolean =>
  exact ? pathname === href : [href, ...matches].some((each) => isAtPath(pathname, each));

// The on-screen keyboard is up when it has taken a quarter of the window: the visual viewport shrinks, the layout
// viewport does not. Subscribed as an external store so the server and first client render agree (no keyboard).
const subscribeToKeyboard = (notify: () => void): (() => void) => {
  const viewport = window.visualViewport;
  viewport?.addEventListener('resize', notify);
  return () => viewport?.removeEventListener('resize', notify);
};
const keyboardIsUp = (): boolean => {
  const viewport = window.visualViewport;
  return !!viewport && viewport.height < window.innerHeight * 0.75;
};
const keyboardIsNever = (): boolean => false;

const SectionLinks = ({ label, sections }: SectionNavProps): ReactElement => {
  const pathname = usePathname();
  const listId = useId();
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  // The address More was opened at, not a flag: a navigation changes the
  // address and so shuts it, with no effect to reset the state.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const keyboard = useSyncExternalStore(subscribeToKeyboard, keyboardIsUp, keyboardIsNever);

  const tablet = useMediaQuery(TABLET_BAND);
  // Measured afresh each time the band is entered and on each navigation, since the current tab's weight changes
  // its width.
  const fit = useMeasuredFit({
    ref: list,
    enabled: tablet,
    measure: measureNatural,
    choose: chooseCount,
    stale: textSizeChanged,
    // The row's width does not change with the text size; its tabs' widths do.
    watch: (element) => element.querySelectorAll('.section-nav__item'),
    fallback: VISIBLE,
    resetKey: pathname,
  });
  const measuring = tablet && fit === null;
  const count = tablet && fit !== null ? fit : VISIBLE;
  const shown = measuring ? sections.length : count;

  // While measuring, More is drawn whenever there is more than one section, so its width is measured; that render is
  // never painted. With one section at least one tab stays out of More.
  const extras = sections.slice(
    measuring ? Math.max(1, Math.min(VISIBLE, sections.length - 1)) : count,
  );
  const hidden = measuring ? undefined : extras.find((section) => isCurrent(pathname, section));

  useDismiss({
    active: open,
    inside: (target) => root.current?.contains(target) ?? false,
    onOutsidePress: () => setOpenAt(null),
    onEscape: () => {
      setOpenAt(null);
      button.current?.focus();
    },
  });

  const apart = (section: SectionNavItem) => (section.apart ? ' section-nav__item--apart' : '');

  return (
    <nav
      ref={root}
      aria-label={label}
      className="section-nav"
      data-keyboard={keyboard ? 'open' : undefined}
      data-fit={tablet && fit !== null ? '' : undefined}
      data-measuring={measuring ? '' : undefined}
    >
      <ul ref={list} className="section-nav__list">
        {sections.map((section, at) => (
          <li
            key={section.href}
            className={`section-nav__item${apart(section)}${at >= shown ? ' section-nav__item--extra' : ''}`}
          >
            <PendingLink
              href={section.href}
              className="section-nav__link"
              aria-current={isCurrent(pathname, section) ? 'page' : undefined}
            >
              <SectionIcon name={section.icon} />
              <span>
                {section.label}
                {section.count !== undefined && <FacetCount count={section.count} />}
              </span>
            </PendingLink>
          </li>
        ))}
        {extras.length > 0 && (
          <li className="section-nav__item section-nav__more">
            <button
              ref={button}
              type="button"
              className="section-nav__link section-nav__more-button"
              aria-expanded={open}
              aria-controls={listId}
              aria-current={hidden ? 'page' : undefined}
              onClick={() => setOpenAt(open ? null : pathname)}
            >
              <SectionIcon name="more" />
              <span>More</span>
              <span className="section-nav__chevron">
                <ChevronIcon />
              </span>
            </button>
            <ul id={listId} className="section-nav__sheet" hidden={!open}>
              {extras.map((section) => (
                <li key={section.href} className={`section-nav__sheet-item${apart(section)}`}>
                  <PendingLink
                    href={section.href}
                    className="section-nav__link"
                    aria-current={isCurrent(pathname, section) ? 'page' : undefined}
                  >
                    <SectionIcon name={section.icon} />
                    <span>
                      {section.label}
                      {section.count !== undefined && <FacetCount count={section.count} />}
                    </span>
                  </PendingLink>
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default SectionLinks;

'use client';

import { PendingLink } from '../../lib/navigation';
import { usePathname } from 'next/navigation';
import {
  type ReactElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { isAtPath } from '../../lib/at-path';
import { ChevronIcon } from '../Combobox/icons';
import SectionIcon from './icons';
import type { SectionNavItem, SectionNavProps } from './types';

// The nav itself, the one client part: only `usePathname()` reads the address,
// and the More button, its dismissal and the on-screen keyboard are state in
// the browser. The list is the server's, passed in as plain data
// (claude-docs/components/section-nav.md).

// How many sections stay in view on a phone, and what the server and the first client render
// show; the stylesheet's `--extra` class hides the rest, so the number lives here once. Wider
// than the phone a measured count replaces it, and until that is known the stylesheet shows
// every tab (`index.scss`).
const VISIBLE = 4;

// Wider than the phone (`$shell-phone-width`, 40rem; `_variables.scss`): the
// number of tabs that fit is measured rather than fixed, since the lead and
// the labelled tabs outrun the context row at many widths, the desktop's
// among them. On the phone the bar keeps its fixed four.
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

const pixels = (value: string): number => Number.parseFloat(value) || 0;

// What is measured of the row with every tab showing: each tab's width with
// its margin, which tab is the current page's and its width without the
// margin, the gap between tabs, More's own width, the gap inside its button
// and its chevron's.
type Natural = {
  widths: number[];
  // -1 when no tab is the current page's.
  current: number;
  currentWidth: number;
  gap: number;
  more: number;
  buttonGap: number;
  chevron: number;
};

const measureNatural = (list: HTMLElement): Natural | null => {
  const items = Array.from(
    list.querySelectorAll<HTMLElement>(':scope > .section-nav__item:not(.section-nav__more)'),
  );
  const widths = items.map(
    (item) => item.offsetWidth + pixels(getComputedStyle(item).marginInlineStart),
  );
  // No layout (happy-dom, a hidden nav): there is nothing to fit, so keep the default.
  if (widths.length === 0 || widths.some((width) => width === 0)) return null;
  const current = items.findIndex((item) => item.querySelector('[aria-current="page"]'));
  const more = list.querySelector<HTMLElement>(':scope > .section-nav__more');
  const chevron = more?.querySelector<HTMLElement>('.section-nav__chevron');
  const moreButton = more?.querySelector<HTMLElement>('.section-nav__more-button');
  return {
    widths,
    current,
    currentWidth: current === -1 ? 0 : items[current]!.offsetWidth,
    gap: pixels(getComputedStyle(list).columnGap),
    more: more?.offsetWidth ?? 0,
    buttonGap: moreButton ? pixels(getComputedStyle(moreButton).columnGap) : 0,
    chevron: chevron?.offsetWidth ?? 0,
  };
};

// The most leading tabs, never fewer than one, that fit `available` beside More; all of them
// when they fit without it. More is reserved at its own width, unless the current page's tab
// is among those it would hide: then More wears that tab's label, so it is reserved at that
// tab's width plus the gap inside the button and the chevron, or at its own if that is wider.
// Not at the widest tab it would hide, which tucks a tab away while the row still has room
// for it: More wears no other tab's label, and a navigation measures the row afresh.
const countThatFit = (
  { widths, current, currentWidth, gap, more, buttonGap, chevron }: Natural,
  available: number,
): number => {
  for (let count = widths.length; count > 1; count -= 1) {
    const tabs = widths.slice(0, count).reduce((sum, width) => sum + width, 0) + gap * (count - 1);
    const reserve = current >= count ? Math.max(more, currentWidth + buttonGap + chevron) : more;
    if (tabs + (count < widths.length ? gap + reserve : 0) <= available) return count;
  }
  return 1;
};

// A section is current at its own address and, unless `exact`, beneath it;
// `matches` adds the addresses of its other tabs.
const isCurrent = (pathname: string, { href, exact, matches = [] }: SectionNavItem): boolean =>
  exact ? pathname === href : [href, ...matches].some((each) => isAtPath(pathname, each));

// A browser without a visual viewport has no keyboard to answer to. The on-screen keyboard is
// up when it has taken a quarter of the window: the visual viewport shrinks, the layout
// viewport does not, which is how a fixed bar ends up sitting on top of the keyboard.
// Subscribed as an external store so the server and the first client render agree (no keyboard).
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
  const natural = useRef<Natural | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  // The address More was opened at, not a flag: a navigation changes the
  // address and so shuts it, with no effect to reset the state.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const keyboard = useSyncExternalStore(subscribeToKeyboard, keyboardIsUp, keyboardIsNever);

  const tablet = useSyncExternalStore(subscribeToBand, inTabletBand, inTabletBandNever);
  // The count that fits; null while it is not known, when
  // every tab is shown so they can be measured.
  const [fit, setFit] = useState<number | null>(null);
  // Each time the band is entered, measure afresh: the count is reset while
  // rendering, the way React asks a state derived from a prop to be.
  const [wasTablet, setWasTablet] = useState(false);
  if (tablet !== wasTablet) {
    setWasTablet(tablet);
    setFit(null);
  }
  // And on each navigation: the current tab's weight changes its width.
  const [measuredAt, setMeasuredAt] = useState(pathname);
  if (pathname !== measuredAt) {
    setMeasuredAt(pathname);
    setFit(null);
  }
  const measuring = tablet && fit === null;
  const count = tablet && fit !== null ? fit : VISIBLE;
  const shown = measuring ? sections.length : count;

  // Measured before the browser paints: with every tab showing, then the
  // count that fits, so no frame shows the row overflowing.
  useLayoutEffect(() => {
    if (!tablet || fit !== null || !list.current) return;
    natural.current = measureNatural(list.current);
    setFit(natural.current ? countThatFit(natural.current, list.current.clientWidth) : VISIBLE);
  }, [tablet, fit]);

  // The row's width changing picks a new count from the widths already
  // measured; the web fonts arriving changes the widths themselves.
  const refit = useCallback(() => {
    if (list.current && natural.current) {
      setFit(countThatFit(natural.current, list.current.clientWidth));
    }
  }, []);
  useEffect(() => {
    const element = list.current;
    if (!tablet || !element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(refit);
    observer.observe(element);
    let current = true;
    void document.fonts?.ready.then(() => {
      if (current) setFit(null);
    });
    return () => {
      current = false;
      observer.disconnect();
    };
  }, [tablet, refit]);

  // While measuring, More is drawn whenever there is more than one section, so
  // its width and chevron are measured even where every tab will fit; that
  // render is never painted. With one section there is nothing to tuck away,
  // so at least one tab stays out of More and `extras` stays empty.
  const extras = sections.slice(
    measuring ? Math.max(1, Math.min(VISIBLE, sections.length - 1)) : count,
  );
  const hidden = measuring ? undefined : extras.find((section) => isCurrent(pathname, section));

  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpenAt(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpenAt(null);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

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
              navigationTarget={section.target}
              className="section-nav__link"
              aria-current={isCurrent(pathname, section) ? 'page' : undefined}
            >
              <SectionIcon name={section.icon} />
              <span className="section-nav__label">{section.label}</span>
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
              <SectionIcon name={hidden ? hidden.icon : 'more'} />
              <span className="section-nav__label">
                {/* The space sits outside the hidden span: a trailing one inside it is
                    trimmed from the name, which then reads "More:Astrology". */}
                {hidden && (
                  <>
                    <span className="visually-hidden">More:</span>{' '}
                  </>
                )}
                {hidden ? hidden.label : 'More'}
              </span>
              <span className="section-nav__chevron">
                <ChevronIcon />
              </span>
            </button>
            <ul id={listId} className="section-nav__sheet" hidden={!open}>
              {extras.map((section) => (
                <li key={section.href} className={`section-nav__sheet-item${apart(section)}`}>
                  <PendingLink
                    href={section.href}
                    navigationTarget={section.target}
                    className="section-nav__link"
                    aria-current={isCurrent(pathname, section) ? 'page' : undefined}
                  >
                    <SectionIcon name={section.icon} />
                    <span className="section-nav__label">{section.label}</span>
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

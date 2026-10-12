'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactElement, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { isAtPath } from '../../lib/at-path';
import { ChevronIcon } from '../Combobox/icons';
import SectionIcon from './icons';
import type { SectionNavItem, SectionNavProps } from './types';

// The nav itself, the one client part: only `usePathname()` reads the address,
// and the More button, its dismissal and the on-screen keyboard are state in
// the browser. The list is the server's, passed in as plain data
// (claude-docs/components/section-nav.md).

// How many sections stay in view when the room is short; the stylesheet's
// `--extra` class hides the rest, so the number lives here once and the
// stylesheet is told by the class, not by a second count.
const VISIBLE = 4;

// A section is current at its own address and, unless `exact`, beneath it;
// `matches` adds the addresses of its other tabs.
const isCurrent = (pathname: string, { href, exact, matches = [] }: SectionNavItem): boolean =>
  exact ? pathname === href : [href, ...matches].some((each) => isAtPath(pathname, each));

// A browser without a visual viewport has no keyboard to answer to. The on-screen keyboard is up when it has taken a quarter of the window: the
// visual viewport shrinks, the layout viewport does not, which is how a fixed
// bar ends up sitting on top of the keyboard. Subscribed as an external
// store so the server and the first client render agree (no keyboard).
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
  const button = useRef<HTMLButtonElement>(null);
  // The address More was opened at, not a flag: a navigation changes the
  // address and so shuts it, with no effect to reset the state.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const keyboard = useSyncExternalStore(subscribeToKeyboard, keyboardIsUp, keyboardIsNever);

  const extras = sections.slice(VISIBLE);
  const hidden = extras.find((section) => isCurrent(pathname, section));

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
    >
      <ul className="section-nav__list">
        {sections.map((section, at) => (
          <li
            key={section.href}
            className={`section-nav__item${apart(section)}${at >= VISIBLE ? ' section-nav__item--extra' : ''}`}
          >
            <Link
              href={section.href}
              className="section-nav__link"
              aria-current={isCurrent(pathname, section) ? 'page' : undefined}
            >
              <SectionIcon name={section.icon} />
              <span className="section-nav__label">{section.label}</span>
            </Link>
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
              <span className="section-nav__label">{hidden ? hidden.label : 'More'}</span>
              <span className="section-nav__chevron">
                <ChevronIcon />
              </span>
            </button>
            <ul id={listId} className="section-nav__sheet" hidden={!open}>
              {extras.map((section) => (
                <li key={section.href} className={`section-nav__sheet-item${apart(section)}`}>
                  <Link
                    href={section.href}
                    className="section-nav__link"
                    aria-current={isCurrent(pathname, section) ? 'page' : undefined}
                  >
                    <SectionIcon name={section.icon} />
                    <span className="section-nav__label">{section.label}</span>
                  </Link>
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

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactElement, useEffect, useId, useRef, useState } from 'react';
import { isAtPath } from '../../lib/at-path';
import SignOutButton from '../SignOutButton';
import ThemeToggle from '../ThemeToggle';
import { initialsOf } from './initials';
import type { AccountMenuProps } from './types';
import './index.scss';

// The account button in the shell's bar and the panel it opens: Your Account,
// at a phone's width the theme switch in its top corner, and Sign Out. A disclosure, not an
// ARIA menu: `role="menu"` promises arrow-key roving and a typeahead this
// does not have, and the panel holds a link, a switch and a button, which a
// menu's three item roles do not cover. The APG disclosure pattern is a button
// with `aria-expanded` and `aria-controls` that shows a region, which is what
// this is. The name is on the button alone; the panel does not repeat it.
// See claude-docs/components/account-menu.md.

const Chevron = (): ReactElement => (
  <svg className="account-menu__chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path
      d="M3.5 6l4.5 4.5L12.5 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AccountMenu = ({ name, verified, links = [] }: AccountMenuProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // A link press leaves the page; the panel should not outlive it.
  const close = (): void => setOpen(false);

  // Open only: a closed menu listens for nothing. Escape is heard on the
  // document, not the panel, so it works wherever the focus is, and it hands
  // the focus back to the button the panel came from.
  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePress = (event: PointerEvent): void => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={root} className="account-menu">
      <button
        ref={button}
        type="button"
        className="account-menu__button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((was) => !was)}
      >
        <span className="account-menu__avatar" aria-hidden="true">
          {initialsOf(name)}
        </span>
        {/* Hidden by size on a phone, not removed: the button keeps its name. */}
        <span className="account-menu__name">{name}</span>
        <Chevron />
      </button>
      {open && (
        <ul id={panelId} className="account-menu__panel">
          {/* On a phone the bar has no room for the disc; it sits in the panel's top
              right corner, first in the order. */}
          <li
            className={
              verified ? 'account-menu__theme' : 'account-menu__theme account-menu__theme--alone'
            }
          >
            <ThemeToggle variant="inline" size="small" />
          </li>
          {verified && (
            <li>
              <Link href="/account" className="account-menu__item" onClick={close}>
                Your Account
              </Link>
            </li>
          )}
          {verified &&
            links.map(({ label, href, base }) => (
              <li key={label} className="account-menu__link">
                <Link
                  href={href}
                  className="account-menu__item"
                  onClick={close}
                  aria-current={isAtPath(pathname, base) ? 'page' : undefined}
                >
                  {label}
                </Link>
              </li>
            ))}
          <li className="account-menu__signout">
            <SignOutButton />
          </li>
        </ul>
      )}
    </div>
  );
};

export default AccountMenu;

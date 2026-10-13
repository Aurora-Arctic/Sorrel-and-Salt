'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactElement, useEffect, useId, useRef, useState } from 'react';
import { isAtPath } from '../../lib/at-path';
import { ACCOUNT_INVITATIONS_PATH, ACCOUNT_PATH } from '../../lib/sign-in';
import IconTip from '../IconTip';
import SignOutButton from './sign-out-button';
import { initialsOf } from './initials';
import type { AccountMenuProps } from './types';
import './index.scss';

// The account button in the shell's bar and the panel it opens: Your Account,
// with a link to the pending invitations beside it when there are any, and
// Sign Out. The theme switch stays in the bar at every width (the owner's
// call, M10.32). A disclosure, not an ARIA menu: `role="menu"` promises
// arrow-key roving and a typeahead this does not have, and the panel holds
// links and a button, which a menu's three item roles do not cover. The APG disclosure pattern is a button
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

const AccountMenu = ({
  name,
  verified,
  links = [],
  pendingInvitations = 0,
}: AccountMenuProps): ReactElement => {
  const [open, setOpen] = useState(false);
  // An unverified account cannot reach the account page the count leads to.
  const pending = verified && pendingInvitations > 0;
  const invitations = `${pendingInvitations} Coven ${pendingInvitations === 1 ? 'Invitation' : 'Invitations'}`;
  // The dot is seen and the tip drawn only; the button's name says it instead,
  // set whole as a label since a flex button's children are blocks, which a
  // browser joins with a space ("Name , 2 …"). It starts with the visible
  // name, as WCAG 2.5.3 asks. The count's link is named by the same words.
  const buttonLabel = pending ? `${name}, ${invitations.toLowerCase()}` : undefined;
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
        aria-label={buttonLabel}
        onClick={() => setOpen((was) => !was)}
      >
        <span className="account-menu__avatar" aria-hidden="true">
          {initialsOf(name)}
          {pending && <span className="account-menu__dot" />}
        </span>
        {/* Hidden by size on a phone, not removed: the button keeps its name. */}
        <span className="account-menu__name">{name}</span>
        <Chevron />
      </button>
      {/* Always mounted and hidden when shut, so it can fade (the stylesheet). */}
      <ul id={panelId} className="account-menu__panel" hidden={!open}>
        {verified && (
          <li className="account-menu__account">
            <Link
              href={ACCOUNT_PATH}
              className={
                pending ? 'account-menu__item account-menu__item--counted' : 'account-menu__item'
              }
              onClick={close}
            >
              Your Account
            </Link>
            {/* A link of its own beside Your Account, not inside it: a press on
                the count opens the invitations, a press on the rest of the row
                the account page (the owner's call, M10.32). */}
            {pending && (
              <span className="account-menu__count">
                <IconTip tip={`You have ${invitations}`} placement="below">
                  <Link
                    href={ACCOUNT_INVITATIONS_PATH}
                    className="account-menu__count-mark"
                    onClick={close}
                  >
                    <span aria-hidden="true">{pendingInvitations}</span>
                    <span className="visually-hidden">{invitations}</span>
                  </Link>
                </IconTip>
              </span>
            )}
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
    </div>
  );
};

export default AccountMenu;

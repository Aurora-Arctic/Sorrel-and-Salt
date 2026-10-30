'use client';

import { usePathname } from 'next/navigation';
import { type ReactElement, useEffect, useId, useRef, useState } from 'react';
import { isAtPath } from '../../lib/at-path';
import { PendingLink } from '../../lib/navigation';
import { siteLinkTarget } from '../AppShell/site-target';
import { ACCOUNT_INVITATIONS_PATH, ACCOUNT_PATH } from '../../lib/sign-in';
import IconTip from '../IconTip';
import SignOutButton from './sign-out-button';
import { initialsOf } from './initials';
import type { AccountMenuProps } from './types';
import './index.scss';

// The account button in the shell's bar and its panel: Your Account, a link to pending invitations
// when there are any, and Sign Out. A disclosure, not an ARIA menu: `role="menu"` promises arrow-key
// roving and a typeahead this lacks (claude-docs/components/account-menu.md).

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

// The account page: its sections beside the jump menu.
const ACCOUNT_TARGET = { region: 'main', shape: 'page', frame: 'with-nav', head: 'title' } as const;

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
  // The dot is drawn only; the button's name carries the count as hidden text that repeats the visible
  // name, whole, so a browser joins it with no stray space. Not an `aria-label`, which must repeat every
  // visible word, the avatar's initials among them (axe's label-content-name-mismatch).
  const fullName = pending ? `${name}, ${invitations.toLowerCase()}` : undefined;
  const pathname = usePathname();
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // A link press leaves the page; the panel should not outlive it.
  const close = (): void => setOpen(false);

  // Open only: a closed menu listens for nothing. Escape is heard on the window so
  // it works wherever the focus is and hears one after a failed Sign Out's callout,
  // which takes its own Escape (`defaultPrevented`) and leaves the menu open.
  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePress = (event: PointerEvent): void => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      window.removeEventListener('keydown', closeOnEscape);
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
          {pending && <span className="account-menu__dot" />}
        </span>
        {/* Hidden by size on a phone, not removed: the button keeps its name. */}
        <span className="account-menu__name" aria-hidden={pending || undefined}>
          {name}
        </span>
        {fullName && <span className="account-menu__count">{fullName}</span>}
        <Chevron />
      </button>
      {/* Always mounted and hidden when shut, so it can fade (the stylesheet). */}
      <ul id={panelId} className="account-menu__panel" hidden={!open}>
        {verified && (
          <li className="account-menu__account">
            <PendingLink
              href={ACCOUNT_PATH}
              navigationTarget={ACCOUNT_TARGET}
              className={
                pending ? 'account-menu__item account-menu__item--counted' : 'account-menu__item'
              }
              onClick={close}
            >
              Your Account
            </PendingLink>
            {/* A link of its own beside Your Account, not inside it: a press on the count
                opens the invitations, a press on the rest of the row the account page. */}
            {pending && (
              <span className="account-menu__count">
                <IconTip tip={`You Have ${invitations}`} placement="below">
                  <PendingLink
                    href={ACCOUNT_INVITATIONS_PATH}
                    navigationTarget={ACCOUNT_TARGET}
                    className="account-menu__count-mark"
                    onClick={close}
                  >
                    <span aria-hidden="true">{pendingInvitations}</span>
                    <span className="visually-hidden">{invitations}</span>
                  </PendingLink>
                </IconTip>
              </span>
            )}
          </li>
        )}
        {verified &&
          links.map(({ label, href, base }) => (
            <li key={label} className="account-menu__link">
              <PendingLink
                href={href}
                navigationTarget={siteLinkTarget(base, href)}
                className="account-menu__item"
                onClick={close}
                aria-current={isAtPath(pathname, base) ? 'page' : undefined}
              >
                {label}
              </PendingLink>
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

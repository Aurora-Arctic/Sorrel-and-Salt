'use client';

import { type ReactElement, useId, useRef, useState } from 'react';
import { useDismiss } from '../../lib/use-dismiss';
import { ChevronIcon } from '../IconTip/icons';
import { accountCounts, countText } from './counts';
import { initialsOf } from './initials';
import Panel from './panel';
import type { AccountMenuProps } from './types';
import './index.scss';

// The account button in the shell's bar and its panel: Your Account, a link to pending invitations
// when there are any, Help, Support and Sign Out. A disclosure, not an ARIA menu: `role="menu"` promises arrow-key
// roving and a typeahead this lacks (claude-docs/components/account-menu.md).

const AccountMenu = ({
  name,
  verified,
  links = [],
  pendingInvitations = 0,
  assignedSupport = 0,
  waitingSupport = 0,
}: AccountMenuProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const { pending, staffCount, senderCount, invitations } = accountCounts({
    verified,
    pendingInvitations,
    assignedSupport,
    waitingSupport,
  });
  const dotted = pending || staffCount > 0 || senderCount > 0;
  // The dot is drawn only; the button's name carries the count as hidden text that repeats the visible
  // name, whole, so a browser joins it with no stray space. Not an `aria-label`, which must repeat every
  // visible word, the avatar's initials among them (axe's label-content-name-mismatch).
  const notes = [
    pending ? invitations.toLowerCase() : null,
    staffCount > 0 ? countText(staffCount, 'assigned to you') : null,
    senderCount > 0 ? countText(senderCount, 'waiting on you') : null,
  ].filter((note) => note !== null);
  const fullName = notes.length > 0 ? `${name}, ${notes.join(', ')}` : undefined;
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  const close = (): void => setOpen(false);

  // Open only: a closed menu listens for nothing. Escape is heard on the window so
  // it works wherever the focus is and hears one after a failed Sign Out's callout,
  // which takes its own Escape (`defaultPrevented`) and leaves the menu open.
  useDismiss({
    active: open,
    inside: (target) => root.current?.contains(target) ?? false,
    onOutsidePress: close,
    onEscape: (event) => {
      if (event.defaultPrevented) return;
      close();
      button.current?.focus();
    },
    escapeOn: 'window',
  });

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
          {dotted && <span className="account-menu__dot" />}
        </span>
        {/* Hidden by size on a phone, not removed: the button keeps its name. */}
        <span className="account-menu__name" aria-hidden={fullName !== undefined || undefined}>
          {name}
        </span>
        {fullName && <span className="account-menu__full-name">{fullName}</span>}
        <ChevronIcon className="account-menu__chevron" />
      </button>
      {/* Always mounted and hidden when shut, so it can fade (the stylesheet). */}
      <ul id={panelId} className="account-menu__panel" hidden={!open}>
        <Panel
          verified={verified}
          links={links}
          pendingInvitations={pendingInvitations}
          assignedSupport={assignedSupport}
          waitingSupport={waitingSupport}
          close={close}
        />
      </ul>
    </div>
  );
};

export default AccountMenu;

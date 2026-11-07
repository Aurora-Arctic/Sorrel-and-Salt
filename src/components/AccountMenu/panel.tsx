'use client';

import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';
import { isAtPath } from '../../lib/at-path';
import { PendingLink } from '../../lib/navigation';
import { siteLinkTarget } from '../AppShell/site-target';
import { ACCOUNT_INVITATIONS_PATH, ACCOUNT_PATH } from '../../lib/sign-in';
import IconTip from '../IconTip';
import SupportLink from '../SupportLink';
import { SUPPORT_LIST_PATH } from '../../lib/support-path';
import SignOutButton from './sign-out-button';
import { countText, supportTip } from './counts';
import type { AccountMenuProps } from './types';

// The rows of the account menu's panel. The menu loads this file the first time it opens, so a page
// does not carry it until the button is pressed (claude-docs/components/account-menu.md).

// The account page: its sections beside the jump menu.
const ACCOUNT_TARGET = { region: 'main', shape: 'page', frame: 'with-nav', head: 'title' } as const;

const ADMIN_ASSIGNED_PATH = '/keepers/support?view=mine';

// The red circle inside a row's link, with a tip naming what it counts, and the same as text for a screen reader: the digits alone say nothing.
function MenuCount({
  count,
  what,
  tipWhat,
}: {
  count: number;
  what: string;
  /** The tip's words after the count, in title case: "Assigned to You". */
  tipWhat: string;
}): ReactElement {
  const { shown, tip } = supportTip(count, tipWhat);
  return (
    <>
      <span className="account-menu__badge-tip">
        <IconTip tip={tip} placement="below">
          <span className="account-menu__badge" aria-hidden="true">
            {shown}
          </span>
        </IconTip>
      </span>
      <span className="visually-hidden">, {countText(count, what)}</span>
    </>
  );
}

export interface AccountMenuPanelProps extends Pick<AccountMenuProps, 'verified' | 'links'> {
  pendingInvitations: number;
  assignedSupport: number;
  waitingSupport: number;
  /** Closes the panel: a link press leaves the page, and the panel should not outlive it. */
  close: () => void;
}

export default function AccountMenuPanel({
  verified,
  links = [],
  pendingInvitations,
  assignedSupport,
  waitingSupport,
  close,
}: AccountMenuPanelProps): ReactElement {
  const pathname = usePathname();
  const pending = verified && pendingInvitations > 0;
  const staffCount = verified ? assignedSupport : 0;
  const senderCount = verified ? waitingSupport : 0;
  const invitations = `${pendingInvitations} Coven ${pendingInvitations === 1 ? 'Invitation' : 'Invitations'}`;
  return (
    <>
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
        links.map(({ label, href, base }) => {
          const counted = base === '/keepers' && staffCount > 0;
          const { shown, tip } = supportTip(staffCount, 'Assigned to You');
          return (
            <li
              key={label}
              className={
                counted ? 'account-menu__link account-menu__link--counted' : 'account-menu__link'
              }
            >
              <PendingLink
                href={href}
                navigationTarget={siteLinkTarget(base, href)}
                className={
                  counted ? 'account-menu__item account-menu__item--counted' : 'account-menu__item'
                }
                onClick={close}
                aria-current={isAtPath(pathname, base) ? 'page' : undefined}
              >
                {label}
              </PendingLink>
              {/* A link of its own beside Keepers, as the invitations count is beside Your Account:
                  a press on the circle opens the requests assigned to the viewer, on the rest of the row /keepers. */}
              {counted && (
                <span className="account-menu__count">
                  <IconTip tip={tip} placement="below">
                    <PendingLink
                      href={ADMIN_ASSIGNED_PATH as typeof href}
                      navigationTarget={siteLinkTarget(base, ADMIN_ASSIGNED_PATH as typeof href)}
                      className="account-menu__count-mark"
                      onClick={close}
                    >
                      <span aria-hidden="true">{shown}</span>
                      <span className="visually-hidden">
                        {countText(staffCount, 'assigned to you')}
                      </span>
                    </PendingLink>
                  </IconTip>
                </span>
              )}
            </li>
          );
        })}
      {verified && (
        <li
          className={
            senderCount > 0
              ? 'account-menu__link account-menu__link--counted'
              : 'account-menu__link'
          }
        >
          {senderCount > 0 ? (
            // Waiting requests: the row leads to the list that shows which, not to a blank form.
            <PendingLink
              href={SUPPORT_LIST_PATH}
              navigationTarget={ACCOUNT_TARGET}
              className="account-menu__item"
              onClick={close}
            >
              Support
              <MenuCount count={senderCount} what="waiting on you" tipWhat="Waiting on You" />
            </PendingLink>
          ) : (
            <SupportLink className="account-menu__item" onClick={close}>
              Support
            </SupportLink>
          )}
        </li>
      )}
      <li className="account-menu__signout">
        <SignOutButton />
      </li>
    </>
  );
}

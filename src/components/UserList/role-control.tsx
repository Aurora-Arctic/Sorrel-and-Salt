'use client';

import {
  type CSSProperties,
  type ReactElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { graphql } from '../../gql';
import { useTip } from '../InfoTip/use-tip';
import { graphqlRequest } from '../../lib/graphql-client';
import { PRIMARY_ADMIN_REFUSAL } from '../../lib/primary-admin';
import ConfirmedAction from './confirmed-action';
import { unverifiedWarning } from './warning';
import type { RoleControlProps } from './types';

// The row's Grant or Revoke of admin (MB.59), beside the role it changes,
// each asking first in a modal naming the user, with an optional reason the
// ledger keeps. The primary admin's Revoke stays in view but cannot be used,
// its reason in a tip that opens as InfoTip's does and said again when it is
// tried (claude-docs/components/user-list.md).

const SetUserRoleDocument = graphql(`
  mutation SetUserRole($userId: ID!, $role: UserRole!, $note: String) {
    setUserRole(userId: $userId, role: $role, note: $note) {
      id
      role
      canCreateWorkspace
    }
  }
`);

/**
 * The primary admin's Revoke: `aria-disabled` rather than `disabled`, so it
 * keeps its place in the tab order and a click still lands, which says why
 * rather than doing nothing. The reason is the button's description, in a tip
 * that opens on hover, focus and a tap, stays open while the pointer is on it
 * and closes on Escape (WCAG 1.4.13), through InfoTip's `useTip`. Each
 * attempt also mounts the tip afresh as an alert, so a screen reader hears the
 * reason again. The tip is placed against the viewport rather than its cell:
 * the table's frame scrolls, so it clips whatever reaches past it, and the
 * reason is taller than the heading row above the top row. Any scroll closes
 * it, since it would no longer sit by the button.
 */
const PrimaryAdminRevoke = ({ name }: { name: string }): ReactElement => {
  const reasonId = useId();
  const { open, show, hide, hideSoon } = useTip();
  const [attempts, setAttempts] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const [place, setPlace] = useState<CSSProperties>();

  // Above the button from its left edge, as the cell's tips are, its bottom
  // margin apart, and kept off the screen's edges by its side margin, the
  // stylesheet's gutter, which the browser resolves to pixels. Placed at the
  // origin first and measured, so the offset holds whatever box an ancestor
  // makes the containing block of a fixed element (a transform does); the
  // measured origin includes the side margin, so it is not added twice.
  useLayoutEffect(() => {
    if (!open || !button.current || !tip.current) return;
    const bubble = tip.current;
    bubble.style.top = '0px';
    bubble.style.left = '0px';
    const origin = bubble.getBoundingClientRect();
    const at = button.current.getBoundingClientRect();
    const style = getComputedStyle(bubble);
    const gutter = parseFloat(style.marginLeft) || 0;
    const gap = parseFloat(style.marginBottom) || 0;
    const widest = window.innerWidth - origin.width - gutter;
    setPlace({
      top: at.top - origin.height - gap - origin.top,
      left: Math.max(gutter, Math.min(at.left, widest)) - origin.left,
    });
  }, [open, attempts]);

  useEffect(() => {
    if (!open) return;
    // Captured, so a scroll of the table's frame closes it as the page's does.
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [open, hide]);

  return (
    // Hover on the wrapper, which holds the tip as well as the button, so the
    // pointer can move onto the tip without closing it.
    <span className="user-list__locked" onMouseEnter={show} onMouseLeave={hideSoon}>
      <button
        ref={button}
        className="btn btn--small btn--destructive"
        type="button"
        aria-label={`Revoke admin from ${name}`}
        aria-disabled="true"
        aria-describedby={reasonId}
        onFocus={show}
        onBlur={hide}
        onClick={() => {
          show();
          setAttempts((count) => count + 1);
        }}
      >
        Revoke
      </button>
      <span
        ref={tip}
        key={attempts}
        id={reasonId}
        role={attempts ? 'alert' : 'tooltip'}
        className={
          open
            ? 'user-list__control-tip user-list__control-tip--fixed is-open'
            : 'user-list__control-tip user-list__control-tip--fixed'
        }
        style={place}
        aria-hidden={!open}
      >
        {PRIMARY_ADMIN_REFUSAL}
      </span>
    </span>
  );
};

const RoleControl = ({
  userId,
  name,
  emailVerified,
  primaryAdmin,
  action,
}: RoleControlProps): ReactElement => {
  if (action === 'revoke' && primaryAdmin) return <PrimaryAdminRevoke name={name} />;
  return action === 'grant' ? (
    <ConfirmedAction
      label="Grant"
      accessibleName={`Grant admin to ${name}`}
      openClass="btn btn--small btn--quiet"
      title="Grant Admin"
      question={
        <>
          Make <strong>{name}</strong> an admin? Admins curate the compendium and its lists, and can
          grant and revoke admin. They will also be able to create covens.
        </>
      }
      warning={emailVerified ? undefined : unverifiedWarning('Granting')}
      busy="Granting"
      confirmClass="btn btn--solid"
      withNote
      send={(note) => graphqlRequest(SetUserRoleDocument, { userId, role: 'admin', note })}
    />
  ) : (
    <ConfirmedAction
      label="Revoke"
      accessibleName={`Revoke admin from ${name}`}
      openClass="btn btn--small btn--destructive"
      title="Revoke Admin"
      question={
        <>
          Stop <strong>{name}</strong> being an admin? They keep their covens, and everything they
          wrote stays as it is.
        </>
      }
      busy="Revoking"
      confirmClass="btn btn--destructive"
      withNote
      send={(note) => graphqlRequest(SetUserRoleDocument, { userId, role: 'user', note })}
    />
  );
};

export default RoleControl;

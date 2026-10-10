'use client';

import { type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { PRIMARY_ADMIN_REFUSAL } from '../../lib/primary-admin';
import ConfirmedAction from './confirmed-action';
import { unverifiedWarning } from './warning';
import type { RoleControlProps } from './types';

// The row's Grant or Revoke of admin (MB.59), beside the role it changes,
// each asking first in a modal naming the user, with an optional reason the
// ledger keeps. The primary admin's Revoke stays in view but cannot be used,
// its reason beside it and said again when it is tried
// (claude-docs/components/user-list.md).

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
 * rather than doing nothing. The reason is the button's description, and each
 * attempt mounts it afresh as an alert, so a screen reader hears it again.
 */
const PrimaryAdminRevoke = ({ name }: { name: string }): ReactElement => {
  const reasonId = useId();
  const [attempts, setAttempts] = useState(0);
  return (
    <>
      <button
        className="btn btn--small btn--destructive"
        type="button"
        aria-label={`Revoke admin from ${name}`}
        aria-disabled="true"
        aria-describedby={reasonId}
        onClick={() => setAttempts((count) => count + 1)}
      >
        Revoke
      </button>
      <p
        key={attempts}
        id={reasonId}
        className="user-list__reason"
        role={attempts ? 'alert' : undefined}
      >
        {PRIMARY_ADMIN_REFUSAL}
      </p>
    </>
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

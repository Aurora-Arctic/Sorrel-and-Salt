'use client';

import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { ADMIN_CHANGES_PAUSED_REFUSAL, PRIMARY_ADMIN_REFUSAL } from '../../lib/primary-admin';
import ConfirmedAction from './confirmed-action';
import LockedControl from './locked-control';
import { unverifiedWarning } from './warning';
import type { RoleControlProps } from './types';

// The row's Grant or Revoke of admin (MB.59), beside the role it changes,
// each asking first in a modal naming the user, with an optional reason the
// ledger keeps. The primary admin's Revoke stays in view but cannot be used,
// its reason in a tip that opens as InfoTip's does and said again when it is
// tried; so do every Grant and Revoke while admin changes are paused, to an
// admin the pause binds (MB.63) (claude-docs/components/user-list.md).

const SetUserRoleDocument = graphql(`
  mutation SetUserRole($userId: ID!, $role: UserRole!, $note: String) {
    setUserRole(userId: $userId, role: $role, note: $note) {
      id
      role
      canCreateWorkspace
    }
  }
`);

const RoleControl = ({
  userId,
  name,
  emailVerified,
  primaryAdmin,
  paused = false,
  action,
}: RoleControlProps): ReactElement => {
  const grant = action === 'grant';
  const label = grant ? 'Grant' : 'Revoke';
  const accessibleName = grant ? `Grant admin to ${name}` : `Revoke admin from ${name}`;
  const openClass = grant ? 'btn btn--small btn--quiet' : 'btn btn--small btn--destructive';
  // The primary admin's own reason first: it holds whether or not changes are paused.
  const reason =
    !grant && primaryAdmin
      ? PRIMARY_ADMIN_REFUSAL
      : paused
        ? ADMIN_CHANGES_PAUSED_REFUSAL
        : undefined;
  if (reason) {
    return (
      <LockedControl
        label={label}
        accessibleName={accessibleName}
        className={openClass}
        reason={reason}
      />
    );
  }
  return grant ? (
    <ConfirmedAction
      label={label}
      accessibleName={accessibleName}
      openClass={openClass}
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
      label={label}
      accessibleName={accessibleName}
      openClass={openClass}
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

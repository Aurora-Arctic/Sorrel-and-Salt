'use client';

import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { ADMIN_CHANGES_PAUSED_REFUSAL, PRIMARY_ADMIN_REFUSAL } from '../../lib/primary-admin';
import type { UserRole } from '../../lib/session';
import { RadioGroupField } from '../Field';
import ConfirmedAction from './confirmed-action';
import LockedControl from './locked-control';
import { outranks, SITE_ROLES } from '../../lib/site-roles';
import { roleLabel, SITE_ROLE_ACCESS } from './roles';
import { unverifiedWarning } from './warning';
import type { RoleControlProps } from './types';

// The row's Change Role beside the role it changes (one control for every role, curator included),
// as the members page's is: a modal naming the user asks which role they move to, every role but
// the one they hold, with an optional reason the ledger keeps. The primary admin's stays in view
// but cannot be used, its reason in a tip that opens as InfoTip's does and said again when it is
// tried; so does every one while admin changes are paused, to an admin the pause binds
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

const RoleControl = ({
  userId,
  name,
  emailVerified,
  primaryAdmin,
  paused = false,
  role,
  inModal = false,
}: RoleControlProps): ReactElement => {
  // Every role but the one held now: choosing it would change nothing.
  const options = SITE_ROLES.filter((candidate) => candidate !== role);
  const [chosen, setChosen] = useState<UserRole>(options[0]!);
  const label = 'Change Role';
  const accessibleName = `${label} for ${name}`;
  const openClass = 'btn btn--small btn--quiet';
  // The primary admin's own reason first: it holds whether or not changes are paused.
  const reason = primaryAdmin
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
  // Up the list is a promotion, down it a demotion; the confirm says which,
  // green for one and red for the other, as the choice is made. Only a
  // promotion vouches for the address, so only it warns.
  const promoting = outranks(chosen, role);
  return (
    <ConfirmedAction
      label={label}
      accessibleName={accessibleName}
      openClass={openClass}
      confirmLabel={promoting ? 'Promote' : 'Demote'}
      title="Change Role"
      question={
        <>
          Choose a role for <strong>{name}</strong>.
        </>
      }
      choices={(sending) => (
        <RadioGroupField
          legend="New Role"
          name={`site-role-${userId}`}
          options={options.map((option) => ({
            value: option,
            label: roleLabel(option),
            description: SITE_ROLE_ACCESS[option],
          }))}
          value={chosen}
          // Held still while the change is out, without redrawing as disabled.
          onChange={(option) => !sending && setChosen(option)}
        />
      )}
      warning={promoting && !emailVerified ? unverifiedWarning('Promoting') : undefined}
      busy={promoting ? 'Promoting' : 'Demoting'}
      confirmClass={promoting ? 'btn btn--solid' : 'btn btn--destructive'}
      withNote
      announcement={`${name} is now ${roleLabel(chosen)}.`}
      inModal={inModal}
      // Beside its fact in the user's modal, not in a button row: a refusal
      // there is the callout too.
      refusalInModal="callout"
      send={(note) => graphqlRequest(SetUserRoleDocument, { userId, role: chosen, note })}
    />
  );
};

export default RoleControl;

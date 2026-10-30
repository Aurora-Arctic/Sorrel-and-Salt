'use client';

import { type ReactElement, useState } from 'react';
import type { WorkspaceRole } from '@/modules/coven';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { RadioGroupField } from '../Field';
import ConfirmedAction from '../UserList/confirmed-action';
import { workspaceRoleLabel } from '../UserDetail/roles';
import { WORKSPACE_ROLE_ACCESS } from './role-access';
import type { RoleControlProps } from './types';

// The members page's Change Role: a modal asking which role the member moves to, then
// `updateMemberRole`. Owners only; the service refuses leaving no owner, said in a callout
// (claude-docs/components/member-list.md).

const UpdateMemberRoleDocument = graphql(`
  mutation UpdateMemberRole($workspaceId: ID!, $userId: ID!, $role: WorkspaceRole!) {
    updateMemberRole(workspaceId: $workspaceId, userId: $userId, role: $role) {
      role
      user {
        id
      }
    }
  }
`);

// Viewer, member, owner: the order the choices are drawn in.
const ROLES: readonly WorkspaceRole[] = ['viewer', 'member', 'owner'];

const RoleControl = ({
  workspaceId,
  userId,
  name,
  currentRole,
}: RoleControlProps): ReactElement => {
  // Every role but the one held now: choosing it would change nothing.
  const options = ROLES.filter((candidate) => candidate !== currentRole);
  const [picked, setPicked] = useState(options[0]);
  // The role is read again after a change, and the options with it: a pick
  // the new options no longer hold falls back to the first.
  const chosen = options.includes(picked) ? picked : options[0];
  // Up the ladder is a promotion, down it a demotion; the modal's confirm says
  // which, green for one and red for the other, as the choice is made.
  const promoting = ROLES.indexOf(chosen) > ROLES.indexOf(currentRole);
  const label = 'Change Role';
  return (
    <ConfirmedAction
      label={label}
      accessibleName={`${label} for ${name}`}
      openClass="btn btn--quiet btn--small"
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
          name={`role-${userId}`}
          options={options.map((role) => ({
            value: role,
            label: workspaceRoleLabel(role),
            description: WORKSPACE_ROLE_ACCESS[role],
          }))}
          value={chosen}
          // Held still while the change is out, without redrawing as disabled.
          onChange={(role) => !sending && setPicked(role)}
        />
      )}
      closeOnSent
      busy={promoting ? 'Promoting' : 'Demoting'}
      confirmClass={promoting ? 'btn btn--solid' : 'btn btn--destructive'}
      announcement={`${name} is now ${workspaceRoleLabel(chosen)}.`}
      send={() => graphqlRequest(UpdateMemberRoleDocument, { workspaceId, userId, role: chosen })}
    />
  );
};

export default RoleControl;

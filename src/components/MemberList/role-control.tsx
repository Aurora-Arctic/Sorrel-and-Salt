'use client';

import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { RadioGroupField } from '../Field';
import ConfirmedAction from '../UserList/confirmed-action';
import { workspaceRoleLabel } from '../UserDetail/roles';
import { WORKSPACE_ROLE_ACCESS } from './role-access';
import { useRoleFailure } from './role-failure';
import type { RoleControlProps } from './types';

// The members page's Promote and Demote beside a role (M6.13). Each opens a
// modal naming the member and asking which role they move to, every choice
// with what that role may do, then sends `updateMemberRole`. The page shows
// the controls to owners only; the service is the guard, and refuses a
// demotion that would leave no owner, which the failure notice then says
// above the table (claude-docs/components/member-list.md).

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

const RoleControl = ({
  workspaceId,
  userId,
  name,
  direction,
  options,
}: RoleControlProps): ReactElement => {
  const { report } = useRoleFailure();
  // The rung nearest the member's own, which the options are listed from.
  const [picked, setPicked] = useState(options[0]);
  // The role is read again after a change, and the options with it: a pick
  // the new options no longer hold falls back to the first.
  const chosen = options.includes(picked) ? picked : options[0];
  const promote = direction === 'promote';
  const label = promote ? 'Promote' : 'Demote';
  return (
    <ConfirmedAction
      label={label}
      accessibleName={`${label} ${name}`}
      openClass={promote ? 'btn btn--small btn--quiet' : 'btn btn--small btn--destructive'}
      title={`${label} Member`}
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
      busy={promote ? 'Promoting' : 'Demoting'}
      confirmClass={promote ? 'btn btn--solid' : 'btn btn--destructive'}
      onFailure={(message) => report(message && `${name}'s role was not changed. ${message}`)}
      send={() => graphqlRequest(UpdateMemberRoleDocument, { workspaceId, userId, role: chosen })}
    />
  );
};

export default RoleControl;

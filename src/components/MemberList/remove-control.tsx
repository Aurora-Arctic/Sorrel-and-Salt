'use client';

import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from '../UserList/confirmed-action';
import type { RemoveControlProps } from './types';

// The members page's Remove: it asks first, naming the member, then sends `removeMember`. Owners
// only; the service refuses removing the last owner, said in a callout
// (claude-docs/components/member-list.md).

const RemoveMemberDocument = graphql(`
  mutation RemoveMember($workspaceId: ID!, $userId: ID!) {
    removeMember(workspaceId: $workspaceId, userId: $userId)
  }
`);

const RemoveControl = ({ workspaceId, userId, name }: RemoveControlProps): ReactElement => (
  <ConfirmedAction
    label="Remove"
    accessibleName={`Remove ${name}`}
    openClass="btn btn--quiet btn--small"
    title="Remove Member"
    question={
      <>
        Remove <strong>{name}</strong> from this coven? They lose access to its ingredients and its
        grimoire until an owner invites them back.
      </>
    }
    busy="Removing"
    confirmClass="btn btn--destructive"
    announcement={`${name} is removed.`}
    send={() => graphqlRequest(RemoveMemberDocument, { workspaceId, userId })}
  />
);

export default RemoveControl;

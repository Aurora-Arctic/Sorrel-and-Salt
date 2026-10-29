'use client';

import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from '../UserList/confirmed-action';
import type { RemoveControlProps } from './types';

// The members page's Remove at the end of a row. It asks first, naming the member, then sends
// `removeMember`; the page is read again and the row is gone. The page shows it to owners
// only; the service is the guard, and refuses removing the last owner, which a callout under
// the control says. A removal is said in the page's status region
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
    openClass="btn btn--small btn--destructive"
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

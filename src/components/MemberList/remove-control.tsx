'use client';

import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { useActionFailure } from '../ActionFailure';
import ConfirmedAction from '../UserList/confirmed-action';
import type { RemoveControlProps } from './types';

// The members page's Remove at the end of a row (M6.15). It asks first,
// naming the member, then sends `removeMember`; the page is read again and
// the row is gone. The page shows it to owners only; the service is the
// guard, and refuses removing the last owner, which the failure notice says
// above the table, or beside the control when nothing above it takes it
// (claude-docs/components/member-list.md).

const RemoveMemberDocument = graphql(`
  mutation RemoveMember($workspaceId: ID!, $userId: ID!) {
    removeMember(workspaceId: $workspaceId, userId: $userId)
  }
`);

const RemoveControl = ({ workspaceId, userId, name }: RemoveControlProps): ReactElement => {
  const failure = useActionFailure();
  return (
    <ConfirmedAction
      label="Remove"
      accessibleName={`Remove ${name}`}
      openClass="btn btn--small btn--destructive"
      title="Remove Member"
      question={
        <>
          Remove <strong>{name}</strong> from this coven? They lose access to its ingredients and
          its grimoire until an owner invites them back.
        </>
      }
      busy="Removing"
      confirmClass="btn btn--destructive"
      // Without an ActionFailure above, left out: the control then says the
      // refusal itself, beside its button, rather than dropping it.
      onFailure={
        failure
          ? (message) => failure.report(message && `${name} was not removed. ${message}`)
          : undefined
      }
      send={() => graphqlRequest(RemoveMemberDocument, { workspaceId, userId })}
    />
  );
};

export default RemoveControl;

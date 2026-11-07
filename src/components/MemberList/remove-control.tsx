'use client';

import type { ReactElement } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from '../ConfirmedAction';
import type { RemoveControlProps } from './types';

// The members page's Remove: it asks first, naming the member, then sends `removeMember`. Stewards
// only; the service refuses removing the last steward, said in a callout
// (claude-docs/components/member-list.md).

const RemoveMemberDocument = graphql(`
  mutation RemoveMember($workspaceId: ID!, $userId: ID!) {
    removeMember(workspaceId: $workspaceId, userId: $userId)
  }
`);

const RemoveControl = ({
  workspaceId,
  userId,
  name,
  inModal = false,
  onSent,
}: RemoveControlProps): ReactElement => (
  <ConfirmedAction
    label="Remove"
    accessibleName={`Remove ${name}`}
    openClass={inModal ? 'btn btn--quiet' : 'btn btn--quiet btn--small'}
    title="Remove Member"
    question={
      <>
        Remove <strong>{name}</strong> from this coven? They lose access to its ingredients and its
        grimoire until a steward invites them back.
      </>
    }
    busy="Removing"
    confirmClass="btn btn--destructive"
    announcement={`${name} is removed.`}
    inModal={inModal}
    onSent={onSent}
    send={() => graphqlRequest(RemoveMemberDocument, { workspaceId, userId })}
  />
);

export default RemoveControl;

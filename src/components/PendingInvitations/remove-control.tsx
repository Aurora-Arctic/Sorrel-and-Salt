'use client';

import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from '../UserList/confirmed-action';
import type { RevokeControlProps } from './types';

// A declined invitation's Remove on the members page: the invitee has said no, so there is
// nothing left to withdraw, only a row to clear. It asks first, then sends the coven's
// `revokeInvitation`, which stamps a declined row as it stamps a pending one, and the page is
// read again with the row gone. Its link keeps saying it was declined, the invitee's answer
// outranking the owner's stamp (claude-docs/components/pending-invitations.md).

const RemoveDeclinedInvitationDocument = graphql(`
  mutation RemoveDeclinedInvitation($workspaceId: ID!, $id: ID!) {
    revokeInvitation(workspaceId: $workspaceId, id: $id) {
      id
    }
  }
`);

const RemoveControl = ({ workspaceId, invitation }: RevokeControlProps): ReactElement => (
  <ConfirmedAction
    label="Remove"
    accessibleName={`Remove the declined invitation to ${invitation.email}`}
    openClass="btn btn--small btn--destructive"
    title="Remove Invitation"
    question={
      <>
        Remove the declined invitation to <strong>{invitation.email}</strong> from this list?
      </>
    }
    busy="Removing"
    confirmClass="btn btn--destructive"
    announcement={`The declined invitation to ${invitation.email} is removed.`}
    send={() =>
      graphqlRequest(RemoveDeclinedInvitationDocument, { workspaceId, id: invitation.id })
    }
  />
);

export default RemoveControl;

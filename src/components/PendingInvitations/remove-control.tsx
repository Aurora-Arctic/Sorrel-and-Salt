'use client';

import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from '../UserList/confirmed-action';
import type { RevokeControlProps } from './types';

// A declined invitation's Remove: it asks first, then sends `revokeInvitation`, which stamps a
// declined row as a pending one. The link keeps saying declined, the invitee's answer outranking
// the stamp (claude-docs/components/pending-invitations.md).

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

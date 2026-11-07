'use client';

import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from '../ConfirmedAction';
import type { RevokeControlProps } from './types';

// Revoking a declined row stamps it pending; the link keeps saying declined, as the invitee's answer outranks the stamp (claude-docs/components/pending-invitations.md).

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
    openClass="btn btn--quiet btn--small"
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

'use client';

import type { ReactElement } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from '../ConfirmedAction';
import type { InvitationActionProps } from './types';

// A declined row's Remove and a pending row's Revoke send the same mutation: the page draws Revoke for
// stewards only, the service is the guard. Revoking a declined row stamps it pending; the link keeps
// saying declined, as the invitee's answer outranks the stamp (claude-docs/components/pending-invitations.md).

const RevokeInvitationDocument = graphql(`
  mutation RevokeInvitation($workspaceId: ID!, $id: ID!) {
    revokeInvitation(workspaceId: $workspaceId, id: $id) {
      id
    }
  }
`);

const InvitationAction = ({
  workspaceId,
  invitation,
  declined = false,
}: InvitationActionProps): ReactElement => (
  <ConfirmedAction
    label={declined ? 'Remove' : 'Revoke'}
    accessibleName={
      declined
        ? `Remove the declined invitation to ${invitation.email}`
        : `Revoke the invitation to ${invitation.email}`
    }
    openClass="btn btn--quiet btn--small"
    title={declined ? 'Remove Invitation' : 'Revoke Invitation'}
    question={
      declined ? (
        <>
          Remove the declined invitation to <strong>{invitation.email}</strong> from this list?
        </>
      ) : (
        <>
          Revoke the invitation to <strong>{invitation.email}</strong>? Its link will say it was
          withdrawn.
        </>
      )
    }
    busy={declined ? 'Removing' : 'Revoking'}
    confirmClass="btn btn--destructive"
    announcement={
      declined
        ? `The declined invitation to ${invitation.email} is removed.`
        : `The invitation to ${invitation.email} is revoked.`
    }
    send={() => graphqlRequest(RevokeInvitationDocument, { workspaceId, id: invitation.id })}
  />
);

export default InvitationAction;

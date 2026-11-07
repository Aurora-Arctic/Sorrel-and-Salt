'use client';

import type { ReactElement } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from '../ConfirmedAction';
import type { RevokeControlProps } from './types';

// The page draws it for stewards only; the service is the guard (claude-docs/components/pending-invitations.md).

const RevokeInvitationDocument = graphql(`
  mutation RevokeInvitation($workspaceId: ID!, $id: ID!) {
    revokeInvitation(workspaceId: $workspaceId, id: $id) {
      id
    }
  }
`);

const RevokeControl = ({ workspaceId, invitation }: RevokeControlProps): ReactElement => (
  <ConfirmedAction
    label="Revoke"
    accessibleName={`Revoke the invitation to ${invitation.email}`}
    openClass="btn btn--quiet btn--small"
    title="Revoke Invitation"
    question={
      <>
        Revoke the invitation to <strong>{invitation.email}</strong>? Its link will say it was
        withdrawn.
      </>
    }
    busy="Revoking"
    confirmClass="btn btn--destructive"
    announcement={`The invitation to ${invitation.email} is revoked.`}
    send={() => graphqlRequest(RevokeInvitationDocument, { workspaceId, id: invitation.id })}
  />
);

export default RevokeControl;

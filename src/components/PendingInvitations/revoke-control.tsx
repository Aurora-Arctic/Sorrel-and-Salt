'use client';

import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from '../UserList/confirmed-action';
import type { RevokeControlProps } from './types';

// A pending invitation's Revoke on the members page. It asks first, naming the address, then
// sends `revokeInvitation`; the page is read again and the row is gone, or the refusal is
// said in a callout under the control. The page draws it for owners only; the service is the
// guard (claude-docs/components/pending-invitations.md).

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
    openClass="btn btn--small btn--destructive"
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

'use client';

import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from '../UserList/confirmed-action';
import type { AcceptControlProps } from './types';

// A received invitation's Decline on the account page. It asks first, naming the coven, then
// sends `declineInvitationById`, which checks that the invitation is addressed to this
// verified account and stamps it declined; the page and the shell are read again, so the row
// and the menu's count go, and the status region says so, or the refusal is said in a callout
// under the button. The coven's owner then sees it declined
// (claude-docs/components/received-invitations.md).

const DeclineInvitationByIdDocument = graphql(`
  mutation DeclineInvitationById($id: ID!) {
    declineInvitationById(id: $id) {
      id
      declinedAt
    }
  }
`);

const DeclineControl = ({ invitation: { id, covenName } }: AcceptControlProps): ReactElement => (
  <ConfirmedAction
    label="Decline"
    accessibleName={`Decline the invitation to ${covenName}`}
    openClass="btn btn--small btn--destructive"
    title="Decline Invitation"
    question={
      <>
        Decline the invitation to <strong>{covenName}</strong>? Its owner will see that you
        declined, and its link will stop working.
      </>
    }
    busy="Declining"
    confirmClass="btn btn--destructive"
    announcement={`The invitation to ${covenName} is declined.`}
    send={() => graphqlRequest(DeclineInvitationByIdDocument, { id })}
  />
);

export default DeclineControl;

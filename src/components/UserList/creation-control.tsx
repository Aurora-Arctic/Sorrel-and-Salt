'use client';

import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from './confirmed-action';
import { unverifiedWarning } from './warning';
import type { CreationControlProps } from './types';

// The row's Approve or Revoke (M5.8), beside the mark it changes: lets a user
// with no invitation create a coven, or stops them, behind a confirmation
// naming them. A success re-reads the page, whose row then offers the other
// action. Approving an unverified address warns first, and still approves
// (MB.205).

const GrantWorkspaceCreationDocument = graphql(`
  mutation GrantWorkspaceCreation($userId: ID!) {
    grantWorkspaceCreation(userId: $userId) {
      id
      canCreateWorkspace
    }
  }
`);

const RevokeWorkspaceCreationDocument = graphql(`
  mutation RevokeWorkspaceCreation($userId: ID!) {
    revokeWorkspaceCreation(userId: $userId) {
      id
      canCreateWorkspace
    }
  }
`);

const CreationControl = ({
  userId,
  name,
  emailVerified,
  action,
}: CreationControlProps): ReactElement =>
  action === 'approve' ? (
    <ConfirmedAction
      label="Approve"
      accessibleName={`Approve ${name}`}
      // Quiet, the body ink, on the owner's call.
      openClass="btn btn--small btn--quiet"
      title="Approve Coven Creation"
      // The user's name in bold, on the owner's call.
      question={
        <>
          Let <strong>{name}</strong> create covens?
        </>
      }
      // Revoke vouches for no one, so it carries none.
      warning={emailVerified ? undefined : unverifiedWarning('Approving')}
      busy="Approving"
      confirmClass="btn btn--solid"
      send={() => graphqlRequest(GrantWorkspaceCreationDocument, { userId })}
    />
  ) : (
    <ConfirmedAction
      label="Revoke"
      accessibleName={`Revoke approval for ${name}`}
      // Red, on the owner's call: it takes something away.
      openClass="btn btn--small btn--destructive"
      title="Revoke Coven Creation"
      question={
        <>
          Stop <strong>{name}</strong> from creating covens? Covens they own stay theirs.
        </>
      }
      busy="Revoking"
      confirmClass="btn btn--destructive"
      send={() => graphqlRequest(RevokeWorkspaceCreationDocument, { userId })}
    />
  );

export default CreationControl;

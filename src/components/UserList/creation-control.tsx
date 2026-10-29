'use client';

import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { ADMIN_CHANGES_PAUSED_REFUSAL } from '../../lib/primary-admin';
import ConfirmedAction from './confirmed-action';
import LockedControl from './locked-control';
import { unverifiedWarning } from './warning';
import type { CreationControlProps } from './types';

// The row's Approve or Revoke, beside the mark it changes: lets a user
// with no invitation create a coven, or stops them, behind a confirmation
// naming them, with an optional reason the ledger keeps, as Change Role
// takes one. A success re-reads the page, whose row then offers the
// other action. Approving an unverified address warns first, and still
// approves.

const GrantWorkspaceCreationDocument = graphql(`
  mutation GrantWorkspaceCreation($userId: ID!, $note: String) {
    grantWorkspaceCreation(userId: $userId, note: $note) {
      id
      canCreateWorkspace
    }
  }
`);

const RevokeWorkspaceCreationDocument = graphql(`
  mutation RevokeWorkspaceCreation($userId: ID!, $note: String) {
    revokeWorkspaceCreation(userId: $userId, note: $note) {
      id
      canCreateWorkspace
    }
  }
`);

const CreationControl = ({
  userId,
  name,
  emailVerified,
  paused = false,
  action,
  inModal = false,
}: CreationControlProps): ReactElement =>
  // Locked while admin changes are paused, as Change Role is.
  paused ? (
    <LockedControl
      label={action === 'approve' ? 'Approve' : 'Revoke'}
      accessibleName={action === 'approve' ? `Approve ${name}` : `Revoke approval for ${name}`}
      className={
        action === 'approve' ? 'btn btn--small btn--quiet' : 'btn btn--small btn--destructive'
      }
      reason={ADMIN_CHANGES_PAUSED_REFUSAL}
    />
  ) : action === 'approve' ? (
    <ConfirmedAction
      label="Approve"
      accessibleName={`Approve ${name}`}
      // Quiet, the body ink.
      openClass="btn btn--small btn--quiet"
      title="Approve Coven Creation"
      // The user's name in bold.
      question={
        <>
          Let <strong>{name}</strong> create covens?
        </>
      }
      // Revoke vouches for no one, so it carries none.
      warning={emailVerified ? undefined : unverifiedWarning('Approving')}
      busy="Approving"
      confirmClass="btn btn--solid"
      withNote
      announcement={`${name} may now create covens.`}
      inModal={inModal}
      // Beside its fact in the user's modal, not in a button row: a refusal
      // there is the callout too.
      refusalInModal="callout"
      send={(note) => graphqlRequest(GrantWorkspaceCreationDocument, { userId, note })}
    />
  ) : (
    <ConfirmedAction
      label="Revoke"
      accessibleName={`Revoke approval for ${name}`}
      // Red: it takes something away.
      openClass="btn btn--small btn--destructive"
      title="Revoke Coven Creation"
      question={
        <>
          Stop <strong>{name}</strong> from creating covens? Covens they own stay theirs.
        </>
      }
      busy="Revoking"
      confirmClass="btn btn--destructive"
      withNote
      announcement={`${name} may no longer create covens.`}
      inModal={inModal}
      // Beside its fact in the user's modal, not in a button row: a refusal
      // there is the callout too.
      refusalInModal="callout"
      send={(note) => graphqlRequest(RevokeWorkspaceCreationDocument, { userId, note })}
    />
  );

export default CreationControl;

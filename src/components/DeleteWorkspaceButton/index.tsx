'use client';

import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from '../UserList/confirmed-action';
import type { DeleteWorkspaceButtonProps } from './types';

// An owner's Delete on the coven index page (M6.14). It asks first, naming the
// coven and what becomes unreachable, then sends the deletion and leaves the
// page, which the member no longer has. The service is the guard: the page
// shows this only to a role holding `workspace: delete`
// (claude-docs/components/delete-workspace-button.md).

const DeleteWorkspaceDocument = graphql(`
  mutation DeleteWorkspace($workspaceId: ID!) {
    deleteWorkspace(workspaceId: $workspaceId)
  }
`);

const DeleteWorkspaceButton = ({ workspaceId, name }: DeleteWorkspaceButtonProps): ReactElement => {
  const router = useRouter();
  return (
    <ConfirmedAction
      label="Delete Workspace"
      accessibleName="Delete Workspace"
      openClass="btn btn--destructive"
      title="Delete Workspace"
      question={
        <>
          Delete <strong>{name}</strong>? Its ingredients and its grimoire become inaccessible to
          every member, other owners included.
        </>
      }
      warning="Nothing is destroyed, but only an administrator with database access can restore it."
      busy="Deleting"
      confirmClass="btn btn--destructive"
      send={() => graphqlRequest(DeleteWorkspaceDocument, { workspaceId })}
      // The coven is gone for this user too, so the page cannot be read again.
      onSent={() => router.replace('/')}
    />
  );
};

export default DeleteWorkspaceButton;

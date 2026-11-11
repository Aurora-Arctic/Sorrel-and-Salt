'use client';

import { useLeaveCoven } from '../../lib/navigation';
import type { ReactElement } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from '../ConfirmedAction';
import type { DeleteWorkspaceButtonProps } from './types';

// The page shows it only to a role holding `workspace: delete` (claude-docs/components/delete-workspace-button.md).

const DeleteWorkspaceDocument = graphql(`
  mutation DeleteWorkspace($workspaceId: ID!) {
    deleteWorkspace(workspaceId: $workspaceId)
  }
`);

const DeleteWorkspaceButton = ({
  workspaceId,
  name,
  inModal,
  onlyOwner = false,
}: DeleteWorkspaceButtonProps): ReactElement => {
  const leaveCoven = useLeaveCoven();
  return (
    <ConfirmedAction
      label="Delete Coven"
      accessibleName="Delete Coven"
      openClass="btn btn--destructive"
      title="Delete Coven"
      question={
        <>
          Delete <strong>{name}</strong>? Its ingredients and its grimoire become inaccessible to
          every member{onlyOwner ? '' : ', other stewards included'}.
        </>
      }
      warning="Nothing is destroyed, but only an administrator with database access can restore it."
      busy="Deleting"
      confirmClass="btn btn--destructive"
      inModal={inModal}
      send={() => graphqlRequest(DeleteWorkspaceDocument, { workspaceId })}
      // The coven is gone for this user too.
      onSent={leaveCoven}
    />
  );
};

export default DeleteWorkspaceButton;

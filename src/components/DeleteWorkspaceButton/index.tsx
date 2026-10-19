'use client';

import { usePendingNavigation } from '../../lib/navigation';
import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { COVEN_LANDING_PATH } from '../../lib/coven-path';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from '../UserList/confirmed-action';
import { useActionFailure } from '../ActionFailure';
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

const DeleteWorkspaceButton = ({
  workspaceId,
  name,
  inModal,
  onlyOwner = false,
}: DeleteWorkspaceButtonProps): ReactElement => {
  const { navigate, refresh } = usePendingNavigation();
  // Said above the page's buttons when it gives a place for that.
  const failure = useActionFailure();
  return (
    <ConfirmedAction
      label="Delete Coven"
      accessibleName="Delete Coven"
      openClass="btn btn--destructive"
      title="Delete Coven"
      question={
        <>
          Delete <strong>{name}</strong>? Its ingredients and its grimoire become inaccessible to
          every member{onlyOwner ? '' : ', other owners included'}.
        </>
      }
      warning="Nothing is destroyed, but only an administrator with database access can restore it."
      busy="Deleting"
      confirmClass="btn btn--destructive"
      onFailure={failure?.report}
      inModal={inModal}
      send={() => graphqlRequest(DeleteWorkspaceDocument, { workspaceId })}
      // The coven is gone for this user too, so the page cannot be read again:
      // replace it with the landing, and refresh so the shell's switcher stops
      // listing it (a client-side replace does not re-run the layout).
      onSent={() => {
        navigate(COVEN_LANDING_PATH, { replace: true });
        refresh();
      }}
    />
  );
};

export default DeleteWorkspaceButton;

'use client';

import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from '../UserList/confirmed-action';
import { useActionFailure } from '../WorkspaceActions/action-failure';
import type { LeaveWorkspaceButtonProps } from './types';

// Leave on the coven index page (M6.15), shown to every role. It asks first,
// naming the coven, then sends the leave and goes to the home page, which the
// member can no longer read this coven from. The service is the guard: the
// last owner is refused there and the refusal is said beside the button
// (claude-docs/components/leave-workspace-button.md).

const LeaveWorkspaceDocument = graphql(`
  mutation LeaveWorkspace($workspaceId: ID!) {
    leaveWorkspace(workspaceId: $workspaceId)
  }
`);

const LeaveWorkspaceButton = ({ workspaceId, name }: LeaveWorkspaceButtonProps): ReactElement => {
  const router = useRouter();
  // Said above the page's buttons when it gives a place for that.
  const failure = useActionFailure();
  return (
    <ConfirmedAction
      label="Leave Workspace"
      accessibleName="Leave Workspace"
      openClass="btn"
      title="Leave Workspace"
      question={
        <>
          Leave <strong>{name}</strong>? You lose access to its ingredients and its grimoire until
          an owner invites you back.
        </>
      }
      warning="Your own entries stay with the coven."
      busy="Leaving"
      confirmClass="btn btn--destructive"
      onFailure={failure?.report}
      send={() => graphqlRequest(LeaveWorkspaceDocument, { workspaceId })}
      // The coven is closed to this user now, so the page cannot be read again.
      onSent={() => router.replace('/')}
    />
  );
};

export default LeaveWorkspaceButton;

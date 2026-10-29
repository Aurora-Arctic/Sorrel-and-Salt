'use client';

import { usePendingNavigation } from '../../lib/navigation';
import type { ReactElement } from 'react';
import { COVEN_LANDING_PATH } from '../../lib/coven-path';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from '../UserList/confirmed-action';
import { LeaveWorkspaceDocument } from './documents';
import OwnerExit from './owner-exit';
import type { LeaveWorkspaceButtonProps } from './types';

// Leave on the coven index page, shown to every role. It asks first, naming the coven, then
// sends the leave and goes to the coven landing. The service is the guard: the last owner is
// refused there and the refusal is said in a callout under this button. The coven's only
// owner is given `successors` and gets the guided exit instead (`owner-exit.tsx`;
// claude-docs/components/leave-workspace-button.md).

const LeaveWorkspaceButton = ({
  workspaceId,
  name,
  successors,
}: LeaveWorkspaceButtonProps): ReactElement => {
  const { navigate, refresh } = usePendingNavigation();
  // The sole owner would be refused, so they are shown the ways out instead.
  if (successors)
    return <OwnerExit workspaceId={workspaceId} name={name} successors={successors} />;
  return (
    <ConfirmedAction
      label="Leave Coven"
      accessibleName="Leave Coven"
      openClass="btn"
      title="Leave Coven"
      question={
        <>
          Leave <strong>{name}</strong>? You lose access to its ingredients and its grimoire until
          an owner invites you back.
        </>
      }
      warning="Your own entries stay with the coven."
      busy="Leaving"
      confirmClass="btn btn--destructive"
      send={() => graphqlRequest(LeaveWorkspaceDocument, { workspaceId })}
      // The coven is closed to this user now, so the page cannot be read again:
      // replace it with the landing, and refresh so the shell's switcher stops
      // listing it (a client-side replace does not re-run the layout).
      onSent={() => {
        navigate(COVEN_LANDING_PATH, { replace: true });
        refresh();
      }}
    />
  );
};

export default LeaveWorkspaceButton;

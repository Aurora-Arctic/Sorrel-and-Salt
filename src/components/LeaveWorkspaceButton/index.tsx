'use client';

import { useLeaveCoven } from '../../lib/navigation';
import type { ReactElement } from 'react';
import { graphqlRequest } from '../../lib/graphql-client';
import ConfirmedAction from '../ConfirmedAction';
import { LeaveWorkspaceDocument } from './documents';
import OwnerExit from './owner-exit';
import type { LeaveWorkspaceButtonProps } from './types';

// Leave on the coven index page, for every role: it asks first, sends the leave, and goes to the
// coven landing. The service refuses the last steward, shown in a callout; the only steward gets
// `owner-exit.tsx` instead (claude-docs/components/leave-workspace-button.md).

const LeaveWorkspaceButton = ({
  workspaceId,
  name,
  successors,
  quiet = false,
}: LeaveWorkspaceButtonProps): ReactElement => {
  const leaveCoven = useLeaveCoven();
  // The sole steward would be refused, so they are shown the ways out instead.
  if (successors)
    return <OwnerExit workspaceId={workspaceId} name={name} successors={successors} />;
  return (
    <ConfirmedAction
      label="Leave Coven"
      accessibleName="Leave Coven"
      openClass={quiet ? 'btn btn--quiet' : 'btn'}
      title="Leave Coven"
      question={
        <>
          Leave <strong>{name}</strong>? You lose access to its ingredients and its grimoire until a
          steward invites you back.
        </>
      }
      warning="Your own entries stay with the coven."
      busy="Leaving"
      confirmClass="btn btn--destructive"
      send={() => graphqlRequest(LeaveWorkspaceDocument, { workspaceId })}
      // The coven is closed to this user now, so the page cannot be read again.
      onSent={leaveCoven}
    />
  );
};

export default LeaveWorkspaceButton;

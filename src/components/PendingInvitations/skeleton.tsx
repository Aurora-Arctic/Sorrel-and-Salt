import type { ReactElement } from 'react';
import { ListBodySkeleton } from '../ListFrame/skeleton';

/** The list's rows with nothing in them yet: its table's headings over placeholder rows. */
export const PendingInvitationsBodySkeleton = (): ReactElement => (
  <ListBodySkeleton
    label="Pending Invitations"
    rowKind="pending-invitations"
    headings={['Email', 'Role', 'Status', 'Action']}
    actions={['Action']}
  />
);

import type { ReactElement } from 'react';
import { ListBodySkeleton } from '../ListFrame/skeleton';

/** The list's rows with nothing in them yet: its table's headings over placeholder rows. */
export const AdminInvitationsBodySkeleton = (): ReactElement => (
  <ListBodySkeleton
    label="Keeper Invitations"
    headings={['Email', 'Role', 'Reason', 'Expires', 'Revoke']}
    actions={['Revoke']}
    count={4}
  />
);

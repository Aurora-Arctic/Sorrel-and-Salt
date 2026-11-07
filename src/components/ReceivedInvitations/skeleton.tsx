import type { ReactElement } from 'react';
import { ListBodySkeleton } from '../ListFrame/skeleton';

/** The list's rows with nothing in them yet: its table's headings over placeholder rows. */
export const ReceivedInvitationsBodySkeleton = (): ReactElement => (
  <ListBodySkeleton
    label="Your Invitations"
    rowKind="received-invitations"
    tableClassName="data-table--nowrap"
    headings={['Coven', 'Role', 'Expires', 'Answer']}
    actions={['Answer']}
    count={3}
  />
);

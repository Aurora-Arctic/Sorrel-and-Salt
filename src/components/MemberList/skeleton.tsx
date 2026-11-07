import type { ReactElement } from 'react';
import { ListBodySkeleton } from '../ListFrame/skeleton';

/**
 * The list's rows with nothing in them yet: its table's headings over placeholder rows. Email and
 * Access follow the role, as the list's own; drawn for a steward until the viewer's role is known.
 */
export const MemberListBodySkeleton = ({
  showEmail = true,
  showAccess = true,
}: {
  showEmail?: boolean;
  showAccess?: boolean;
}): ReactElement => (
  <ListBodySkeleton
    label="Members"
    rowKind="members"
    tableClassName="data-table--roomy data-table--nowrap"
    headings={[
      'Name',
      ...(showEmail ? ['Email'] : []),
      'Role',
      'Joined',
      'Invited By',
      'Updated',
      ...(showAccess ? ['Access'] : []),
    ]}
  />
);

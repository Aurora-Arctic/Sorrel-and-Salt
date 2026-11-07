import type { ReactElement } from 'react';
import { ListBodySkeleton } from '../ListFrame/skeleton';

/** The list's rows with nothing in them yet: its table's headings over placeholder rows. */
export const MemberListBodySkeleton = (): ReactElement => (
  <ListBodySkeleton
    label="Members"
    rowKind="members"
    headings={['Name', 'Role', 'Joined', 'Invited By']}
  />
);

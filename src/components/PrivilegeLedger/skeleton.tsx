import type { ReactElement } from 'react';
import { ListBodySkeleton } from '../ListFrame/skeleton';

/** The list's rows with nothing in them yet: its table's headings over placeholder rows. */
export const PrivilegeLedgerBodySkeleton = (): ReactElement => (
  <ListBodySkeleton
    label="Privilege Changes"
    rowKind="privilege-changes"
    headings={['When', 'User', 'Privilege', 'Change', 'How', 'Changed By', 'Note']}
  />
);

import type { ReactElement } from 'react';
import { ListBodySkeleton, ListFilterFrame } from '../ListFrame/skeleton';
import PrivilegeLedgerFilter from './filter';

/** The list's rows with nothing in them yet: its table's headings over placeholder rows. */
export const PrivilegeLedgerBodySkeleton = (): ReactElement => (
  <ListBodySkeleton
    label="Privilege Changes"
    rowKind="privilege-changes"
    headings={['When', 'User', 'Privilege', 'Change', 'How', 'Changed By', 'Note']}
  />
);

/** The ledger with nothing in it yet: its own filter row, unfiltered, over the placeholder rows. */
export const PrivilegeLedgerSkeleton = (): ReactElement => (
  <ListFilterFrame className="privilege-ledger" filter={<PrivilegeLedgerFilter filter={{}} />}>
    <PrivilegeLedgerBodySkeleton />
  </ListFilterFrame>
);

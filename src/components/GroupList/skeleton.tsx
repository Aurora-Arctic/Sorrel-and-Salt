import type { ReactElement } from 'react';
import type { GroupKind } from '../GroupForm/types';
import { ListBodySkeleton, ListFilterFrame } from '../ListFrame/skeleton';
import GroupListFilter from './filter';
import { KINDS } from './kinds';

/** A group list's rows with nothing in them yet. */
export const GroupListBodySkeleton = ({ kind }: { kind: GroupKind }): ReactElement => (
  <ListBodySkeleton
    label={KINDS[kind].title}
    rowKind="groups"
    tableClassName="data-table--roomy"
    headings={['Name', 'Description', 'Updated', 'Edit']}
    actions={['Edit']}
    hidden={['Edit']}
    count={4}
  />
);

// Only the traditions list searches; the other group lists draw no filter row.
const SEARCHED: readonly GroupKind[] = ['tradition'];

/** A group list with nothing in it yet: its own filter row where it has one, over the placeholder rows. */
export const GroupListSkeleton = ({ kind }: { kind: GroupKind }): ReactElement => (
  <ListFilterFrame
    filter={SEARCHED.includes(kind) && <GroupListFilter kind={kind} filter={{ query: '' }} />}
  >
    <GroupListBodySkeleton kind={kind} />
  </ListFilterFrame>
);

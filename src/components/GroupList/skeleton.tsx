import type { ReactElement } from 'react';
import type { GroupKind } from '../GroupForm/types';
import { ListBodySkeleton } from '../ListFrame/skeleton';
import { KINDS } from './kinds';

/** A group list's rows with nothing in them yet. */
export const GroupListBodySkeleton = ({ kind }: { kind: GroupKind }): ReactElement => (
  <ListBodySkeleton
    label={KINDS[kind].title}
    headings={['Name', 'Description', 'Edit']}
    actions={['Edit']}
    count={4}
  />
);

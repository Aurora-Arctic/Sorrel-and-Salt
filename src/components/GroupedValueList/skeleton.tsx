import type { ReactElement } from 'react';
import type { GroupedValueKind } from '../GroupedValueForm/types';
import { ListBodySkeleton } from '../ListFrame/skeleton';
import { KINDS } from './kinds';

/** A curated list's rows with nothing in them yet: its headings, with the group column where the kind has one. */
export const GroupedValueListBodySkeleton = ({
  kind,
}: {
  kind: GroupedValueKind;
}): ReactElement => {
  const { title, group } = KINDS[kind];
  return (
    <ListBodySkeleton
      label={title}
      rowKind="values"
      headings={['Name', ...(group ? [group.label] : []), 'Description', 'Edit']}
      actions={['Edit']}
    />
  );
};

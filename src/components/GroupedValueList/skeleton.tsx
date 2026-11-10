import type { ReactElement } from 'react';
import type { GroupedValueKind } from '../GroupedValueForm/types';
import { ListBodySkeleton, ListFilterFrame } from '../ListFrame/skeleton';
import GroupedValueListFilter from './filter';
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
      rowKind={kind === 'category' ? 'category-values' : 'values'}
      tableClassName={kind === 'category' ? 'data-table--roomy' : undefined}
      headings={['Name', ...(group ? [group.label] : []), 'Description', 'Updated', 'Edit']}
      actions={['Edit']}
      hidden={['Edit']}
    />
  );
};

/** A curated list with nothing in it yet: its own filter row, unfiltered, over the placeholder rows. */
export const GroupedValueListSkeleton = ({ kind }: { kind: GroupedValueKind }): ReactElement => (
  <ListFilterFrame
    className={`grouped-value-list--${kind}`}
    filter={<GroupedValueListFilter kind={kind} filter={{ query: '', group: '' }} groups={[]} />}
  >
    <GroupedValueListBodySkeleton kind={kind} />
  </ListFilterFrame>
);

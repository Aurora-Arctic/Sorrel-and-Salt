import type { ReactElement } from 'react';
import StackTable from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import IngredientCardList from '../IngredientCardList';
import { IngredientCardSkeleton } from '../IngredientCard/skeleton';
import { SpellCardSkeleton } from '../SpellCard/skeleton';
import { ListFilterFrame } from './filter-frame';

export { ListFilterFrame };

export interface ListBodySkeletonProps {
  /** The list's name, as the page's own: "Users". */
  label: string;
  /** A table's column headings, drawn over placeholder rows; absent, the list is cards. */
  headings?: readonly string[];
  /** The headings that are action columns (Edit, Revoke), whose cells carry no bar. */
  actions?: readonly string[];
  /** Which card the cards are: a coven's ingredient (the default), a compendium entry's or a spell's. */
  card?: 'cupboard' | 'compendium' | 'spell';
  /** With `card="spell"`: the cards are drafts, which stand taller than complete ones. */
  draft?: boolean;
  /** The cards' density; the coven lists open compact. */
  density?: 'regular' | 'compact';
  /** How many rows or cards. Default 6. */
  count?: number;
}

// A list's rows with nothing in them yet: its table's real headings over placeholder rows, or empty
// cards, so the list keeps its place when the rows arrive. The filter row is not part of it.
export const ListBodySkeleton = ({
  label,
  headings = [],
  actions = [],
  card = 'cupboard',
  draft = false,
  density,
  count = 6,
}: ListBodySkeletonProps): ReactElement => {
  const cardAt = (at: number) =>
    card === 'spell' ? (
      <SpellCardSkeleton key={at} draft={draft} />
    ) : (
      <IngredientCardSkeleton key={at} kind={card} />
    );
  if (!headings.length) {
    return (
      <IngredientCardList label={label} density={density}>
        {Array.from({ length: count }, (_, at) => cardAt(at))}
      </IngredientCardList>
    );
  }
  const columns: StackColumn<never>[] = headings.map((heading) => ({
    heading,
    cell: () => null,
    ...(actions.includes(heading) && { action: 'corner' as const }),
  }));
  return (
    <StackTable
      columns={columns}
      rows={[]}
      rowKey={() => ''}
      empty=""
      aria-label={label}
      pendingRows={count}
    />
  );
};

// A whole list page with nothing in it yet.
export const ListSkeleton = ({
  filter,
  ...body
}: ListBodySkeletonProps & { filter: string }): ReactElement => (
  <ListFilterFrame filter={filter}>
    <ListBodySkeleton {...body} />
  </ListFilterFrame>
);

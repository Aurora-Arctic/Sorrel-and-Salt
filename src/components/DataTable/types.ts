import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { GroupColors } from '../../lib/types';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';

export interface StackColumn<Row> {
  heading: string;
  action?: 'corner' | 'foot';
  hiddenHeading?: boolean;
  headingClassName?: string;
  className?: string;
  cell: (row: Row) => ReactNode;
  sort?: ColumnSort;
}

export type SortDirection = 'ascending' | 'descending';

/** Ascending is the order a first click gives, whichever way the column reads it. */
export interface ColumnSort {
  current?: SortDirection;
  href: Record<SortDirection, Route>;
  labels: Record<SortDirection, string>;
}

export interface OtherOrder {
  label: string;
  href: Route;
  current: boolean;
}

export interface SortChoice {
  /** The column and direction, "Name, A to Z", or another order's own label. */
  label: string;
  href: Route;
}

export interface SortSelectProps {
  choices: readonly SortChoice[];
  /** The address of the order the list is in now. */
  current: Route | undefined;
  /** Drawn but out of use, for a table on its way. */
  disabled?: boolean;
}

export interface StackTableProps<Row> {
  columns: readonly (StackColumn<Row> | false | undefined)[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  /** What shows in the table's place when there are no rows. */
  empty: ReactNode;
  /** The empty state's name, "No Matches" where a filter matched nothing. */
  emptyLabel?: string;
  /** What to do next from the empty state: Clear Filters. */
  emptyAction?: ReactNode;
  /** Leaves the empty state without a status role, where the page already announces its count. */
  emptyQuiet?: boolean;
  'aria-label'?: string;
  className?: string;
  /** Orders beside the sortable columns', offered first in the phone's sort select: a search's Best Match. */
  otherOrders?: readonly OtherOrder[];
  /** Draws this many placeholder rows under the real headings instead of the rows, for a table on its way: hidden from assistive technology, with no sort links or controls. */
  pendingRows?: number;
  /** With `pendingRows`: the list, so at phone width each placeholder row is one block as tall as that list's real stacked row. */
  pendingKind?: StackRowKind;
}

/** The lists whose stacked rows have a measured placeholder height, `$stack-row-skeleton-heights`. */
export type StackRowKind =
  | 'users'
  | 'members'
  | 'support'
  | 'invitation-cards'
  | 'card-sign-ups'
  | 'refused-opens'
  | 'keeper-invitations'
  | 'privilege-changes'
  | 'pending-invitations'
  | 'received-invitations'
  | 'groups'
  | 'values'
  | 'category-values'
  | 'compendium';

export interface GroupChipProps {
  name: string;
  /** The group's chip pair; without both, the name is drawn plain. */
  colors?: Partial<GroupColors>;
  icon?: FormGroupIcon | null;
}

/** Both are null together where the editor's name is withheld. */
export interface UpdatedStamp {
  updatedBy: string | null;
  updatedAt: Date | null;
}

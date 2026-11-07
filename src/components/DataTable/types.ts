import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { GroupColors } from '../../lib/types';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';

/**
 * One column of a stacking table: its heading, which is also the label each
 * of its cells carries as a card, and what a row's cell holds.
 */
export interface StackColumn<Row> {
  /** The column heading, title case, and its cells' label at phone width. */
  heading: string;
  /**
   * An action's column — Edit, Impersonate, Revoke — whose cells carry no
   * label and span the card. `'corner'` also stands the cell at the card's
   * top right, beside the first line (`.data-table__card-action`); `'foot'`
   * leaves it across the card's foot.
   */
  action?: 'corner' | 'foot';
  /** The heading drawn for a screen reader alone, as a pencil's column is: "Edit". */
  hiddenHeading?: boolean;
  /** A class for the column's heading, where the column is styled as one. */
  headingClassName?: string;
  /** A class for each of its cells. */
  className?: string;
  /** What a row shows in this column. */
  cell: (row: Row) => ReactNode;
  /** Sorts the list from its heading, a link to each direction's address; absent, the heading is plain text. */
  sort?: ColumnSort;
}

/** A sort direction, as `aria-sort` names it. */
export type SortDirection = 'ascending' | 'descending';

/**
 * A sortable column's two orders. Ascending is the order a first click gives, whichever way the column reads it:
 * Name's A to Z, or the sourcing score's Lowest First.
 */
export interface ColumnSort {
  /** The direction the list is sorted by this column, or absent when another order holds. */
  current?: SortDirection;
  /** Each direction's address: the same list, sorted that way, at its first page. */
  href: Record<SortDirection, Route>;
  /** Each direction in words, title case: "A to Z", "Lowest First". */
  labels: Record<SortDirection, string>;
}

/** An order no column heading gives, such as a search's Best Match, offered beside the columns' orders. */
export interface OtherOrder {
  label: string;
  href: Route;
  /** Whether the list is in this order now. */
  current: boolean;
}

/** One choice of the sort select a phone shows in place of the headings. */
export interface SortChoice {
  /** The column and direction, "Name, A to Z", or another order's own label. */
  label: string;
  href: Route;
}

export interface SortSelectProps {
  choices: readonly SortChoice[];
  /** The address of the order the list is in now. */
  current: Route | undefined;
}

export interface StackTableProps<Row> {
  /**
   * The columns, in order. A column the table does not show — one a kind
   * lacks, or a feature turned off — is given as `false` or `undefined`,
   * and left out.
   */
  columns: readonly (StackColumn<Row> | false | undefined)[];
  rows: readonly Row[];
  /** Each row's React key: its id. */
  rowKey: (row: Row) => string;
  /** What shows in the table's place when there are no rows. */
  empty: ReactNode;
  /** The empty state's name, "No Matches" where a filter matched nothing. */
  emptyLabel?: string;
  /** What to do next from the empty state: Clear Filters. */
  emptyAction?: ReactNode;
  /** Leaves the empty state without a status role, where the page already announces its count. */
  emptyQuiet?: boolean;
  /** The table's name, where its page names more than one thing: "Categories". */
  'aria-label'?: string;
  /** Modifiers past the stacking table's own: `data-table--roomy`, `data-table--nowrap`. */
  className?: string;
  /** Orders beside the sortable columns', offered first in the phone's sort select: a search's Best Match. */
  otherOrders?: readonly OtherOrder[];
  /** Draws this many placeholder rows under the real headings in place of the rows, for a table on its way: hidden from assistive technology, with no sort links and no controls. */
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
  | 'compendium';

export interface GroupChipProps {
  name: string;
  /** The group's chip pair; without both, the name is drawn plain. */
  colors?: Partial<GroupColors>;
  /**
   * A form group's icon, drawn before the name: its icon name, or `null`
   * for a group with none, which draws the generic. Absent for a group of
   * another kind, which draws no icon.
   */
  icon?: FormGroupIcon | null;
}

/**
 * Who last changed a row and when, as the Updated column shows it. Both are
 * null together where the editor's name is withheld.
 */
export interface UpdatedStamp {
  /** The editor's display name. */
  updatedBy: string | null;
  updatedAt: Date | null;
}

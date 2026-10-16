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
  /** The table's name, where its page names more than one thing: "Categories". */
  'aria-label'?: string;
  /** Modifiers past the stacking table's own: `data-table--roomy`, `data-table--nowrap`. */
  className?: string;
}

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

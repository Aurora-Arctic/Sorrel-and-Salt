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
  label: string;
  href: Route;
}

export interface SortSelectProps {
  choices: readonly SortChoice[];
  current: Route | undefined;
}

export interface StackTableProps<Row> {
  columns: readonly (StackColumn<Row> | false | undefined)[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  empty: ReactNode;
  'aria-label'?: string;
  className?: string;
  otherOrders?: readonly OtherOrder[];
}

export interface GroupChipProps {
  name: string;
  /** The group's chip pair; without both, the name is drawn plain. */
  colors?: Partial<GroupColors>;
  icon?: FormGroupIcon | null;
}

export interface UpdatedStamp {
  updatedBy: string | null;
  updatedAt: Date | null;
}

import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { ListNavigationKind } from '../ListFrame/types';

/**
 * How Filter navigates: `soft`, a client-side navigation inside the list's
 * transition, or `full`, a whole page load, which runs the layout's guard
 * again, as the pager's plain anchors do (UserList, PrivilegeLedger;
 * claude-docs/components/pager.md). The list's own `ListFrame` runs either.
 */
export type FilterNavigation = ListNavigationKind;

/** One value of the filter a page shows: a blank string, `false` or none is no filter. */
export type FilterValue = string | boolean | null | undefined;

export interface FilterFormProps {
  /** The form's accessible name: "Filter Users". */
  label: string;
  /** The page itself, which the form submits to natively before hydration, and the unfiltered first page Clear Filters opens. */
  action: Route;
  /** The filtered list's address, from the caller's own field state, from its first page. */
  href: () => Route;
  /** The caller's "nothing changed": Filter is offered only when the form differs from the filter shown. */
  disabled: boolean;
  /** Each value of the filter the page shows: while any is set, Clear Filters opens the unfiltered list. */
  shown: readonly FilterValue[];
  /** Each value the fields hold now, applied or not: while any is set and none is shown, Clear Filters empties the fields in place. */
  draft: readonly FilterValue[];
  /** Empties every field the caller holds, for Clear Filters with nothing applied. */
  onClear: () => void;
  navigation: FilterNavigation;
  /** The filter's fields, each carrying the `name` the page reads. */
  children: ReactNode;
}

import type { Route } from 'next';
import type { ReactNode } from 'react';

/**
 * How Filter navigates: `soft`, a client-side navigation inside a transition,
 * or `full`, a whole page load, which runs the layout's guard again, as the
 * pager's plain anchors do (UserList, PrivilegeLedger; claude-docs/components/pager.md).
 */
export type FilterNavigation = 'soft' | 'full';

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
  /** Each value of the filter the page shows, not the fields' drafts: Clear Filters is offered while any is set. */
  shown: readonly FilterValue[];
  navigation: FilterNavigation;
  /** The filter's fields, each carrying the `name` the page reads. */
  children: ReactNode;
}

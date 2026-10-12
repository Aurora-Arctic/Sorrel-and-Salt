import type { Route } from 'next';
import type { ReactNode } from 'react';

/** One value of the filter a page shows: a blank string, `false` or none is no filter. */
export type FilterValue = string | boolean | null | undefined;

export interface FilterFormProps {
  /** The form's accessible name: "Filter Users". */
  label: string;
  /** The page itself, which the form submits to natively before hydration, and the unfiltered first page Clear opens. */
  action: Route;
  /** The list's address from its first page under the filter shown with the search box's text, trimmed, in place of the search shown: what the search's submit opens. */
  searchHref: () => Route;
  /** Each value of the filter the page shows: Clear is drawn while any is set. */
  shown: readonly FilterValue[];
  /** The filter's fields, a `SearchField` first, each carrying the `name` the page reads. */
  children: ReactNode;
}

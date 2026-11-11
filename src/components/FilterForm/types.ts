import type { Route } from 'next';
import type { ReactNode } from 'react';

export type FilterValue = string | readonly string[] | boolean | null | undefined;

export interface FilterFormProps {
  label: string;
  action: Route;
  searchHref: () => Route;
  shown: readonly FilterValue[];
  clear?: boolean;
  /** Draw the layer a sticky row fills itself with, so the corner sorrel shows through it (IngredientSearch). Default false. */
  sorrel?: boolean;
  className?: string;
  children: ReactNode;
}

export interface NameFilterProps {
  label: string;
  action: Route;
  /** The search shown, which the draft starts from. */
  query: string;
  /** The first page for a name search, held until the magnifier or Enter sends it. */
  searchHref: (draftQuery: string) => Route;
  /** Further filter values on show, beside the search. */
  shown?: readonly FilterValue[];
  /** Controls after the search, given the draft so one that applies at once carries it. */
  children?: (draftQuery: string) => ReactNode;
}

import type { Route } from 'next';

/** One form as the list shows it: its group by name, and the address that opens it to edit. */
export interface IngredientFormValueListEntry {
  id: string;
  name: string;
  slug: string;
  description: string;
  groupName: string;
  editHref: Route;
}

export interface IngredientFormValueListProps {
  forms: readonly IngredientFormValueListEntry[];
  /** The filter the page shows, which the form starts from and compares against. */
  filter: IngredientFormValueListFilter;
  /** Every live group, alphabetical (MB.35): the Group filter's choices. */
  groups: readonly IngredientFormGroupOption[];
  previousHref?: Route;
  nextHref?: Route;
  /** Where this page stands among them all, for the pager. */
  position?: { page: number; pages: number };
}

/** The list's filter as asked: the name query, and a group by slug, each blank for none. */
export interface IngredientFormValueListFilter {
  query: string;
  group: string;
}

/** A group the list can be narrowed to, named in the address by its slug. */
export interface IngredientFormGroupOption {
  slug: string;
  name: string;
}

/** Where the list stands: its filter, and the cursor of the page a modal opens over. */
export interface FormsPlace {
  query?: string;
  /** A group's slug. */
  group?: string;
  after?: string;
  before?: string;
}

/** Which modal the address opens: the empty one, or a form's by slug. */
export type FormsDialog = 'new' | { edit: string };

/** What the filter form starts from: the page's filter, and the groups it offers. */
export type IngredientFormValueListFilterProps = Pick<
  IngredientFormValueListProps,
  'filter' | 'groups'
>;

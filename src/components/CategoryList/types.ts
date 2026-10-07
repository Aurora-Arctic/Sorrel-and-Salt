import type { Route } from 'next';

/** One category as the list shows it: its group by name, and the address that opens it to edit. */
export interface CategoryListEntry {
  id: string;
  name: string;
  slug: string;
  description: string;
  groupName: string;
  editHref: Route;
}

export interface CategoryListProps {
  categories: readonly CategoryListEntry[];
  /** The filter the page shows, which the form starts from and compares against. */
  filter: CategoryListFilter;
  /** Every live group, alphabetical (MB.35): the Group filter's choices. */
  groups: readonly CategoryGroupOption[];
  previousHref?: Route;
  nextHref?: Route;
  /** Where this page stands among them all, for the pager. */
  position?: { page: number; pages: number };
}

/** The list's filter as asked: the name query, and a group by slug, each blank for none. */
export interface CategoryListFilter {
  query: string;
  group: string;
}

/** A group the list can be narrowed to, named in the address by its slug. */
export interface CategoryGroupOption {
  slug: string;
  name: string;
}

/** Where the list stands: its filter, and the cursor of the page a modal opens over. */
export interface CategoriesPlace {
  query?: string;
  /** A group's slug. */
  group?: string;
  after?: string;
  before?: string;
}

/** Which modal the address opens: the empty one, or a category's by slug. */
export type CategoriesDialog = 'new' | { edit: string };

/** What the filter form starts from: the page's filter, and the groups it offers. */
export type CategoryListFilterProps = Pick<CategoryListProps, 'filter' | 'groups'>;

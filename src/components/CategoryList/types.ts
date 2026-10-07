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
  previousHref?: Route;
  nextHref?: Route;
  /** Where this page stands among them all, for the pager. */
  position?: { page: number; pages: number };
}

/** Where the list stands: the cursor of the page a modal opens over. */
export interface CategoriesCursor {
  after?: string;
  before?: string;
}

/** Which modal the address opens: the empty one, or a category's by slug. */
export type CategoriesDialog = 'new' | { edit: string };

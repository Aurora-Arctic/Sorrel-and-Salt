import type { Route } from 'next';
import type { CategoryGroupChoice, EditedCategory } from '../../../components/CategoryForm/types';

export interface AdminCategoriesPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<CategoriesSearchParams>;
}

/** The page's address: at most one cursor, and the modal open over it — `new` by presence, or `edit` by slug. */
export interface CategoriesSearchParams {
  after?: string | string[];
  before?: string | string[];
  new?: string | string[];
  edit?: string | string[];
}

export interface CategoryDialogProps {
  title: string;
  /** The page the modal opened over, which closing it returns to. */
  closeHref: Route;
  category?: EditedCategory;
  groups: readonly CategoryGroupChoice[];
}

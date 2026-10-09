import type { Route } from 'next';
import type {
  EditedGroupedValue,
  GroupedValueGroupChoice,
} from '../../../components/GroupedValueForm/types';

export interface AdminDeitiesPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<DeitiesSearchParams>;
}

/**
 * The page's address: the filter — a name query, and a tradition by slug —
 * at most one cursor, and the modal open over it — `new` by presence, or
 * `edit` by slug.
 */
export interface DeitiesSearchParams {
  query?: string | string[];
  tradition?: string | string[];
  after?: string | string[];
  before?: string | string[];
  new?: string | string[];
  edit?: string | string[];
}

export interface DeityDialogProps {
  title: string;
  /** The page the modal opened over, which closing it returns to. */
  closeHref: Route;
  /** The deity to edit, its tradition as the form's group; none adds one. */
  deity?: EditedGroupedValue;
  traditions: readonly GroupedValueGroupChoice[];
}

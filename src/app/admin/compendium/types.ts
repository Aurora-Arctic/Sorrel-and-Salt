import type { IngredientFormValues } from '../../../components/IngredientForm/types';
import type { CompendiumPlace } from '../../../components/CompendiumList/types';

export interface AdminCompendiumPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<CompendiumSearchParams>;
}

/**
 * The page's address: the filter — a name query, a classification, and the
 * entries citing nothing — at most one cursor, and the modal open over it —
 * `new` by presence, or `edit` by slug.
 */
export interface CompendiumSearchParams {
  query?: string | string[];
  nomenclature?: string | string[];
  withoutReferences?: string | string[];
  after?: string | string[];
  before?: string | string[];
  new?: string | string[];
  edit?: string | string[];
}

/** The entry an edit opens: its id, which the writes name, and its values as the form shows them. */
export interface EditedEntry {
  id: string;
  values: IngredientFormValues;
}

export interface CompendiumDialogProps {
  title: string;
  /** The list the modal opened over, which closing it returns to and a save reopens from. */
  place: CompendiumPlace;
  entry?: EditedEntry;
}

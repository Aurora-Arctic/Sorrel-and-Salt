import type { IngredientFormValues } from '../../../components/IngredientForm/types';
import type { CompendiumPlace } from '../../../components/CompendiumList/types';
import type { ListSearchParams } from '../types';

export interface AdminCompendiumPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<CompendiumSearchParams>;
}

/**
 * The page's address: every list page's name query, cursor and modal
 * (`list-page.ts`), and the compendium's own two filters, a classification
 * and the entries citing nothing.
 */
export interface CompendiumSearchParams extends ListSearchParams {
  nomenclature?: string | string[];
  withoutReferences?: string | string[];
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

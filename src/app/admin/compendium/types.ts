import type { IngredientFormValues } from '../../../components/IngredientForm/types';
import type { CompendiumPlace } from '../../../components/CompendiumList/types';
import type { ModalHeading } from '../../../components/Modal/types';
import type { ListSearchParams } from '../types';

export interface AdminCompendiumPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<CompendiumSearchParams>;
}

/**
 * The page's address: every list page's name query, cursor and modal
 * (`list-page.ts`), and the compendium's own three filters, a form by its
 * text, a classification and the entries citing nothing.
 */
export interface CompendiumSearchParams extends ListSearchParams {
  form?: string | string[];
  nomenclature?: string | string[];
  withoutReferences?: string | string[];
}

/** The entry an edit opens: its id, which the writes name, and its values as the form shows them. */
export interface EditedEntry {
  id: string;
  values: IngredientFormValues;
}

export interface CompendiumDialogProps {
  /** "Add Ingredient", or the edited entry's eyebrow, name and formal name (MB.115). */
  heading: ModalHeading;
  /** The list the modal opened over, which closing it returns to and a save reopens from. */
  place: CompendiumPlace;
  entry?: EditedEntry;
}

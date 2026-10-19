import type { IngredientFormValues } from '../../../../components/IngredientForm/types';
import type { CompendiumPlace } from '../../../../components/CompendiumList/types';
import type { ModalHeading } from '../../../../components/Modal/types';
import type { ListSearchParams } from '../types';

export interface AdminCompendiumPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<CompendiumSearchParams>;
}

/**
 * The page's address: every list page's name query, cursor and modal
 * (`list-page.ts`), and the compendium's own filters (the table in
 * CompendiumList/params.ts): the forms by their text, the deities by slug, the
 * zodiac signs and planets by name, the entries citing nothing, the elements
 * an entry holds, toxic or not, and the categories with how they combine.
 * Every one repeats for a list.
 */
export interface CompendiumSearchParams extends ListSearchParams {
  forms?: string | string[];
  withoutReferences?: string | string[];
  withoutForms?: string | string[];
  elements?: string | string[];
  categories?: string | string[];
  categoryMode?: string | string[];
  deities?: string | string[];
  zodiac?: string | string[];
  planets?: string | string[];
  toxic?: string | string[];
}

/** The entry an edit opens: its id, which the writes name, and its values as the form shows them. */
export interface EditedEntry {
  id: string;
  values: IngredientFormValues;
}

/** What the page's address opens: an add, or the entry it edits. */
export interface OpenedEntry {
  /** "Add Ingredient", or the edited entry's eyebrow, name and formal name (MB.115). */
  heading: ModalHeading;
  /** The entry edited; none for an add. */
  entry?: EditedEntry;
}

export interface CompendiumDialogProps {
  /** The list the modal opened over, which closing it returns to and a save reopens from. */
  place: CompendiumPlace;
  /** What the address opens; none when it opens nothing, or while a press's is on its way (M9.18). */
  opened?: OpenedEntry;
}

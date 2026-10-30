import type { Route } from 'next';
import type {
  IngredientFormValues,
  ReviewOffer,
} from '../../../../components/IngredientForm/types';
import type { CompendiumPlace } from '../../../../components/CompendiumList/types';
import type { ModalHeading } from '../../../../components/Modal/types';
import type { ListDialog } from '../../../../lib/types';
import type { ListSearchParams } from '../types';

export interface AdminCompendiumPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<CompendiumSearchParams>;
}

/** The page's address: the list pages' query, cursor and modal, and the compendium's own filters. */
export interface CompendiumSearchParams extends ListSearchParams {
  forms?: string | string[];
  withoutReferences?: string | string[];
  withoutForms?: string | string[];
  elements?: string | string[];
  categories?: string | string[];
  categoryMode?: string | string[];
  deities?: string | string[];
  zodiac?: string | string[];
  celestialBodies?: string | string[];
  toxic?: string | string[];
  /** Reviewed by a curator, `1`, or not, `0`; the public page drops it. */
  reviewed?: string | string[];
  /** The entry whose details modal is open over the list, by slug. */
  entry?: string | string[];
}

/** The entry an edit opens: its id, which the writes name, and its values as the form shows them. */
export interface EditedEntry {
  id: string;
  values: IngredientFormValues;
}

/** What the page's address opens: an add, or the entry it edits. */
export interface OpenedEntry {
  /** "Add Ingredient", or the edited entry's eyebrow, name and formal name. */
  heading: ModalHeading;
  /** The entry edited; none for an add. */
  entry?: EditedEntry;
  /**
   * The Reviewed switch as a field of the form, on an add and an edit: built from the uncached
   * review read for a curator or admin, left out for anyone else.
   */
  review?: ReviewOffer;
}

export interface CompendiumDialogProps {
  /** The list the modal opened over, which closing it returns to and a save reopens from. */
  place: CompendiumPlace;
  /** What the address opens; none when it opens nothing, or while a press's is on its way. */
  opened?: OpenedEntry;
  /** The list's own address: the admin Compendium's by default, or the public search's. */
  path?: Route;
  /** The modal the address opens, kept beneath a near match's Quick Look; left out where the list has none. */
  lookUnder?: ListDialog;
}

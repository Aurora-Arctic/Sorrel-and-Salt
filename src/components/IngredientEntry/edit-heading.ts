import type { IngredientEntryEdit } from './types';

/**
 * The eyebrow of the Edit dialog on an entry page. The page also offers a
 * coven's Annotate, which edits only that coven's version, so the head says
 * this edits the Compendium's entry for every coven.
 */
export const EDIT_ENTRY_EYEBROW = 'Edit Compendium Entry';

/** The eyebrow as the tier has it: a coven's own entry is its ingredient (M8.17). */
export const editEyebrow = ({ coven }: Pick<IngredientEntryEdit, 'coven'>): string =>
  coven ? 'Edit Ingredient' : EDIT_ENTRY_EYEBROW;

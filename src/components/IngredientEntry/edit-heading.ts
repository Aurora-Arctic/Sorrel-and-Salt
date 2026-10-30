import type { IngredientEntryEdit } from './types';

/** The Edit dialog's eyebrow on an entry page: the Compendium's entry, edited for every coven, unlike a coven's Annotate. */
export const EDIT_ENTRY_EYEBROW = 'Edit Compendium Entry';

/** The eyebrow as the tier has it: a coven's own entry is its ingredient. */
export const editEyebrow = ({ coven }: Pick<IngredientEntryEdit, 'coven'>): string =>
  coven ? 'Edit Ingredient' : EDIT_ENTRY_EYEBROW;

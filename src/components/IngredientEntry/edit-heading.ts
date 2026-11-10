import type { IngredientEntryEdit } from './types';

export const EDIT_ENTRY_EYEBROW = 'Edit Compendium Entry';

export const editEyebrow = ({ coven }: Pick<IngredientEntryEdit, 'coven'>): string =>
  coven ? 'Edit Ingredient' : EDIT_ENTRY_EYEBROW;

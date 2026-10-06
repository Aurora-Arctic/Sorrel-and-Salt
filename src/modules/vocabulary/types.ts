import type { categoryGroups } from './schema/categories';
import type { ingredientFormGroups, ingredientForms } from './schema/ingredient-forms';

export type CategoryGroupRow = typeof categoryGroups.$inferSelect;

export type IngredientFormGroupRow = typeof ingredientFormGroups.$inferSelect;

export type IngredientFormValueRow = typeof ingredientForms.$inferSelect;

/**
 * An ingredient field a curated vocabulary stands behind, by the input's
 * name: the four a compendium entry is held to (MB.162).
 */
export type CuratedField = 'form' | 'planets' | 'zodiacSigns' | 'deities';

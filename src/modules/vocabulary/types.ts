import type { categories, categoryGroups } from './schema/categories';
import type { deities, deityTraditions } from './schema/deities';
import type { ingredientFormGroups, ingredientForms } from './schema/ingredient-forms';

export type CategoryRow = typeof categories.$inferSelect;

export type CategoryGroupRow = typeof categoryGroups.$inferSelect;

export type IngredientFormGroupRow = typeof ingredientFormGroups.$inferSelect;

export type IngredientFormValueRow = typeof ingredientForms.$inferSelect;

export type DeityRow = typeof deities.$inferSelect;

export type DeityTraditionRow = typeof deityTraditions.$inferSelect;

/**
 * An ingredient field whose compendium values are held to a curated
 * vocabulary by spelling, by the input's name (MB.162): the planets and the
 * signs, which record no pick.
 */
export type CuratedField = 'planets' | 'zodiacSigns';

/**
 * An ingredient field that records the curated row a member picked beside its
 * text, by the input's name (MB.165), and whose compendium values are held to
 * a pick rather than a spelling (MB.167).
 */
export type PickedField = 'form' | 'deities';

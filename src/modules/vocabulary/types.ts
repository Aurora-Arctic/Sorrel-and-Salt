import type { categoryGroups } from './schema/categories';
import type { ingredientFormGroups, ingredientForms } from './schema/ingredient-forms';

export type CategoryGroupRow = typeof categoryGroups.$inferSelect;

export type IngredientFormGroupRow = typeof ingredientFormGroups.$inferSelect;

export type IngredientFormValueRow = typeof ingredientForms.$inferSelect;

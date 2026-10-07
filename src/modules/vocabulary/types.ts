import type { planets } from './schema/astrology';
import type { categories, categoryGroups } from './schema/categories';
import type { deities, deityTraditions } from './schema/deities';
import type { ingredientFormGroups, ingredientForms } from './schema/ingredient-forms';
import type { IngredientRow } from '../../db/repository';

export type {
  AstrologyValueFilter,
  CategoryFilter,
  IngredientFormValueFilter,
} from '../../db/repository';

/**
 * A planet or a zodiac sign: the two tables share one shape, so the planets'
 * row type stands for both (MB.95).
 */
export type AstrologyValueRow = typeof planets.$inferSelect;

export type CategoryRow = typeof categories.$inferSelect;

export type CategoryGroupRow = typeof categoryGroups.$inferSelect;

export type IngredientFormGroupRow = typeof ingredientFormGroups.$inferSelect;

export type IngredientFormValueRow = typeof ingredientForms.$inferSelect;

/**
 * A live compendium entry a form's rename rewrites (M5.6a), and the slug it
 * moves to under the new spelling: the same slug on a change of case.
 */
export interface FormRewrite {
  entry: IngredientRow;
  slug: string;
}

/**
 * A live form a form group's rename or delete moves (M5.6b), and the slug its
 * name and its new group's name give it: the same slug when neither changed.
 */
export interface FormMove {
  form: IngredientFormValueRow;
  slug: string;
}

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

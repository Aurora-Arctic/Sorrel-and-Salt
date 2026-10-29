import type { celestialBodies, zodiacSigns } from './schema/astrology';
import type { categories, categoryGroups } from './schema/categories';
import type { deities, deityTraditions } from './schema/deities';
import type { ingredientFormGroups, ingredientForms } from './schema/ingredient-forms';

export type {
  AstrologyValueFilter,
  CategoryFilter,
  DeityFilter,
  GroupFilter,
  IngredientFormValueFilter,
} from '../../db/repository';

/**
 * A celestial body or a zodiac sign: the two tables share one shape, so the celestial bodies'
 * row type stands for both.
 */
export type AstrologyValueRow = typeof celestialBodies.$inferSelect;

export type CategoryRow = typeof categories.$inferSelect;

export type CategoryGroupRow = typeof categoryGroups.$inferSelect;

export type IngredientFormGroupRow = typeof ingredientFormGroups.$inferSelect;

export type IngredientFormValueRow = typeof ingredientForms.$inferSelect;

/** A live row a group's rename or delete moves, whose slug carries the group's name, and the slug its name and the new group name give it (the same when neither changed). */
export interface GroupMove {
  row: { id: string; name: string; slug: string };
  slug: string;
}

/**
 * A curated vocabulary's table, or one of the tables that group them: what a
 * curated write is made of (`services/curated-writes.ts`).
 */
export type CuratedTable =
  | typeof categories
  | typeof categoryGroups
  | typeof deities
  | typeof deityTraditions
  | typeof ingredientForms
  | typeof ingredientFormGroups
  | typeof celestialBodies
  | typeof zodiacSigns;

/** A curated table as its writes refuse: the table, its slug's partial unique index, what one row is called in a refusal, and what else its slug is made of (" or group" for a form). */
export interface CuratedVocabulary<TTable extends CuratedTable = CuratedTable> {
  table: TTable;
  slugIndex: string;
  noun: string;
  addressHint?: string;
}

/** The tables whose rows are filed under a group, and move when it goes. */
export type GroupedTable = typeof categories | typeof ingredientForms | typeof deities;

/** The tables that group a curated vocabulary. */
export type GroupTable =
  typeof categoryGroups | typeof ingredientFormGroups | typeof deityTraditions;

/**
 * The rows filed under a group, as its rename or delete moves them: what several are called, the column naming their group, and the slug a row's name
 * and its group's name give it (absent for a category). `under` reads every live row through the rows' own list finder.
 */
export interface MovedRows<
  TTable extends GroupedTable = GroupedTable,
> extends CuratedVocabulary<TTable> {
  nouns: string;
  parentColumn: 'groupId' | 'traditionId';
  slugOf?: (name: string, groupName: string) => string;
  under: (groupId: string) => Promise<TTable['$inferSelect'][]>;
}

/** A group table, and the rows filed under it. */
export interface CuratedGroup<
  TTable extends GroupTable = GroupTable,
> extends CuratedVocabulary<TTable> {
  members: MovedRows;
}

/** How a delete refused while live entries hold the row reads: `holding` is "is filed on", and `remedy` the last sentence for that many entries. */
export interface HeldWording {
  name: string;
  holding: string;
  remedy: (count: number) => string;
}

export type DeityRow = typeof deities.$inferSelect;

export type DeityTraditionRow = typeof deityTraditions.$inferSelect;

/** An ingredient field whose compendium values are held to a curated vocabulary by spelling: the celestial bodies and the signs, which record no pick. */
export type CuratedField = 'celestialBodies' | 'zodiacSigns';

/** An ingredient field that records the curated row a member picked beside its text, and whose compendium values are held to a pick rather than a spelling. */
export type PickedField = 'form' | 'deities';

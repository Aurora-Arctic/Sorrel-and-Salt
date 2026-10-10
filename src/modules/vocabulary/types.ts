import type { planets, zodiacSigns } from './schema/astrology';
import type { categories, categoryGroups } from './schema/categories';
import type { deities, deityTraditions } from './schema/deities';
import type { ingredientFormGroups, ingredientForms } from './schema/ingredient-forms';
import type { IngredientRow } from '../../db/repository';

export type {
  AstrologyValueFilter,
  CategoryFilter,
  DeityFilter,
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
 * A live row a group's rename or delete moves, whose slug carries the group's
 * name — a form under its group (M5.6b), a deity under its tradition (MB.132)
 * — and the slug its name and its new group's name give it: the same slug
 * when neither changed.
 */
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
  | typeof planets
  | typeof zodiacSigns;

/**
 * A curated table as its writes refuse: the table, the partial unique index
 * its slug is held by, what one row is called in a refusal — "Another form
 * already has the address …" — and what else its slug is made of, as the
 * refusal's remedy names it: " or group" for a form.
 */
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
 * The rows filed under a group, as its rename or delete moves them: what
 * several are called, the column naming their group, and the slug a row's
 * name and its group's name give it — absent where the group is no part of
 * the slug, a category's. `under` reads every live row under a group through
 * the rows' own list finder, so "live" means what the list means by it.
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

/**
 * How a delete refused while live compendium entries hold the row reads, on
 * either side of the count: `"Rose" is filed on 3 compendium entries — … .
 * Take it off them first.` — `holding` is "is filed on", and `remedy` the
 * last sentence for that many entries.
 */
export interface HeldWording {
  name: string;
  holding: string;
  remedy: (count: number) => string;
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

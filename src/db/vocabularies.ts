import type { PgTable } from 'drizzle-orm/pg-core';
import { planets, zodiacSigns } from '../modules/vocabulary/schema/astrology';
import { categories, categoryGroups } from '../modules/vocabulary/schema/categories';
import { deities, deityTraditions } from '../modules/vocabulary/schema/deities';
import {
  ingredientFormGroups,
  ingredientForms,
} from '../modules/vocabulary/schema/ingredient-forms';

// The curated vocabularies by shape, listed once for the repository and the
// seed alike: tables and the types derived from them, no client, so the seed
// and a finder read the same pairs. A ninth vocabulary is a line here, and
// the repository's grouping, its unions and the seed's item rows follow.

/** An item table, the group table it is filed under, and the item's property keying it. */
function pairOf<TItems extends PgTable, TGroups extends PgTable, TKey extends keyof TItems>(
  items: TItems,
  groups: TGroups,
  key: TKey,
) {
  return { items, groups, key, column: items[key] };
}

/**
 * The two-tier vocabularies: a form under its group, a category under its
 * group, a deity under its tradition. `key` is the item's property naming its
 * group's id, which the seed writes, and `column` that property's column,
 * which a finder joins and filters by.
 */
export const TWO_TIER = {
  forms: pairOf(ingredientForms, ingredientFormGroups, 'groupId'),
  categories: pairOf(categories, categoryGroups, 'groupId'),
  deities: pairOf(deities, deityTraditions, 'traditionId'),
} as const;

/** The one-tier vocabularies, filed under no group. */
export const FLAT = { planets, zodiacSigns } as const;

/** One two-tier vocabulary's tables and key. */
export type TwoTierPair = (typeof TWO_TIER)[keyof typeof TWO_TIER];

/** An item table filed under a group: forms, categories, deities. */
export type ItemTable = (typeof TWO_TIER)[keyof typeof TWO_TIER]['items'];

/** A group table items are filed under: form groups, category groups, traditions. */
export type GroupTable = (typeof TWO_TIER)[keyof typeof TWO_TIER]['groups'];

/** A vocabulary filed under no group: the planets and the zodiac signs. */
export type FlatTable = (typeof FLAT)[keyof typeof FLAT];

/**
 * A two-tier vocabulary an ingredient picks a row of by id — its form, its
 * deities (MB.167). Categories are assigned through a join table instead.
 */
export type PickedTable = (typeof TWO_TIER)['forms' | 'deities']['items'];

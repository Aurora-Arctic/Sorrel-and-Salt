import 'server-only';
import { findManyByIds } from '../../../db/repository';
import { NotFound } from '../../../lib/errors';
import { inIdOrder } from '../../../lib/in-id-order';
import { categoryGroups } from '../schema/categories';
import { deityTraditions } from '../schema/deities';
import { ingredientFormGroups } from '../schema/ingredient-forms';
import type { CategoryGroupRow, DeityTraditionRow, IngredientFormGroupRow } from '../types';

// The group lookups behind `Category.group`, `IngredientFormValue.group` and
// `Deity.tradition`. Public reference data — a compendium chip wears its
// group's colours for a signed-out visitor too (MB.80) — so none takes a
// session.

/**
 * The category groups by id, one answer per id in the order given: the row,
 * or a `NotFound` where no live group carries the id, so a loader rejects that
 * key alone. One read whatever the batch size.
 */
export function categoryGroupsOf(ids: readonly string[]): Promise<(CategoryGroupRow | NotFound)[]> {
  return groupsOf(categoryGroups, ids);
}

/** The ingredient form groups by id, answered as `categoryGroupsOf` answers. */
export function formGroupsOf(
  ids: readonly string[],
): Promise<(IngredientFormGroupRow | NotFound)[]> {
  return groupsOf(ingredientFormGroups, ids);
}

/**
 * The deity traditions by id, answered as `categoryGroupsOf` answers. A
 * deity is read only while its tradition is live, so a `NotFound` here means
 * one retired between the two reads.
 */
export function deityTraditionsOf(
  ids: readonly string[],
): Promise<(DeityTraditionRow | NotFound)[]> {
  return groupsOf(deityTraditions, ids);
}

async function groupsOf<
  TTable extends typeof categoryGroups | typeof ingredientFormGroups | typeof deityTraditions,
>(table: TTable, ids: readonly string[]): Promise<(TTable['$inferSelect'] | NotFound)[]> {
  const rows = await findManyByIds(table, [...new Set(ids)]);
  return inIdOrder(ids, rows, () => new NotFound('No such group'));
}

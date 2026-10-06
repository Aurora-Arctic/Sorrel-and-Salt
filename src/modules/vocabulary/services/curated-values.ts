import 'server-only';
import { findCuratedRowsByIds, findCuratedRowsByName } from '../../../db/repository';
import { planets, zodiacSigns } from '../schema/astrology';
import { deities } from '../schema/deities';
import { ingredientForms } from '../schema/ingredient-forms';
import type { CuratedField, IngredientFormValueRow, PickedField } from '../types';

const VOCABULARY_OF = { planets, zodiacSigns } satisfies Record<CuratedField, unknown>;

const PICKED_FROM = { form: ingredientForms, deities } satisfies Record<PickedField, unknown>;

/**
 * A value as the curated vocabularies match it: trimmed and lower-cased, the
 * fold the suggestions use (claude-docs/db/member-autofill.md).
 */
export function foldVocabularyValue(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * The live curated spelling each of `values` folds to, keyed by the fold, for
 * the ingredient field `field` draws on; a value no live row curates is
 * absent. A public read, so no session: the vocabularies are global. Two
 * live rows sharing a name give the spelling of the first by id, so the
 * choice is stable.
 */
export async function curatedSpellings(
  field: CuratedField,
  values: readonly string[],
): Promise<Map<string, string>> {
  const folds = [...new Set(values.map(foldVocabularyValue))];
  if (folds.length === 0) return new Map();

  const rows = await findCuratedRowsByName(VOCABULARY_OF[field], folds);
  const spellings = new Map<string, string>();
  for (const row of rows.sort((a, b) => a.id.localeCompare(b.id))) {
    const fold = foldVocabularyValue(row.name);
    if (!spellings.has(fold)) spellings.set(fold, row.name);
  }
  return spellings;
}

/**
 * The name of each of `ids` that a curated row of `field`'s vocabulary holds
 * — live, under a live group or tradition — keyed by id; an id naming none is
 * absent. How a pick is checked before it is written (MB.167). A public read,
 * as `curatedSpellings` is.
 */
export async function curatedNames(
  field: PickedField,
  ids: readonly string[],
): Promise<Map<string, string>> {
  const rows = await findCuratedRowsByIds(PICKED_FROM[field], [...new Set(ids)]);
  return new Map(rows.map((row) => [row.id, row.name]));
}

/**
 * The curated forms by id, one answer per id in the order given: the row, or
 * null where no curated form carries the id — none ever did, or it or its
 * group is retired since it was picked, which `Ingredient.formChoice` reads
 * as no pick (MB.167). One read whatever the batch size, and public, as the
 * forms are.
 */
export async function formChoicesOf(
  ids: readonly string[],
): Promise<(IngredientFormValueRow | null)[]> {
  const rows = await findCuratedRowsByIds(ingredientForms, [...new Set(ids)]);
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id) ?? null);
}

import 'server-only';
import { findCuratedRowsByName } from '../../../db/repository';
import { planets, zodiacSigns } from '../schema/astrology';
import { deities } from '../schema/deities';
import { ingredientForms } from '../schema/ingredient-forms';
import type { CuratedField } from '../types';

const VOCABULARY_OF = {
  form: ingredientForms,
  planets,
  zodiacSigns,
  deities,
} satisfies Record<CuratedField, unknown>;

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

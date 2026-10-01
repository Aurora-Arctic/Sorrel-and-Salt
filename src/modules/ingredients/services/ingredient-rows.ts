import 'server-only';
import { type AuditWriter, findManyOfIngredients } from '../../../db/repository';
import { ingredientFolkNames } from '../schema/ingredient-folk-names';
import type { Membership } from '@/modules/coven';
import type { IngredientFields } from '../types';

// What an ingredient write does the same way in either tier: the parsed
// input as columns, and the folk names written beside the row. Internal to
// the module — the two services import it, and the index does not.

/**
 * The parsed input as columns, every optional one written — `null` where the
 * input has nothing — so an update replaces the row rather than merging into it.
 */
export function columnsOf(fields: IngredientFields) {
  return {
    name: fields.name,
    canonicalName: fields.canonicalName ?? null,
    nomenclature: fields.nomenclature,
    form: fields.form ?? null,
    description: fields.description ?? null,
    element: fields.element ?? null,
    planet: fields.planet ?? null,
    zodiac: fields.zodiac ?? null,
    deities: fields.deities ?? null,
    color: fields.color ?? null,
    safetyNotes: fields.safetyNotes ?? null,
    substitutes: fields.substitutes ?? null,
  };
}

export async function addFolkNames(
  write: AuditWriter,
  ingredientId: string,
  names: readonly string[],
) {
  for (const name of names) await write.insert(ingredientFolkNames, { ingredientId, name });
}

/**
 * Brings the live folk names to exactly `names`, compared as written: a change
 * of case is a new name. Dropped rows go first, so a name re-added in another
 * case clears the case-folded unique index. `memberships` is the tier the
 * parent is read in, as `findManyOfIngredients` takes it: none for a
 * compendium entry.
 */
export async function replaceFolkNames(
  write: AuditWriter,
  memberships: readonly Membership[],
  ingredientId: string,
  names: readonly string[],
) {
  const current = await findManyOfIngredients(memberships, ingredientFolkNames, [ingredientId]);
  const listed = new Set(names);
  const kept = new Set(current.map((row) => row.name));

  await write.softDeleteByIds(
    ingredientFolkNames,
    current.filter((row) => !listed.has(row.name)).map((row) => row.id),
  );
  await addFolkNames(
    write,
    ingredientId,
    names.filter((name) => !kept.has(name)),
  );
}

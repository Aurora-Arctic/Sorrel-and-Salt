import 'server-only';
import { type AuditWriter, findManyOfIngredients, findOneIngredient } from '../../../db/repository';
import { ValidationError } from '../../../lib/errors';
import { ingredientFolkNames } from '../schema/ingredient-folk-names';
import { ingredientSubstitutes } from '../schema/ingredient-substitutes';
import type { Membership } from '@/modules/coven';
import type { ValidationIssue } from '../../../lib/types';
import type { IngredientFields } from '../types';
import type { SubstituteEntry } from '../validation/types';

// What an ingredient write does the same way in either tier: the parsed
// input as columns, and the folk names and substitutes written beside the
// row. Internal to the module — the two services import it, and the index
// does not.

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
    elements: fields.elements ?? null,
    planets: fields.planets ?? null,
    zodiacSigns: fields.zodiacSigns ?? null,
    deities: fields.deities ?? null,
    colors: fields.colors ?? null,
    safetyNotes: fields.safetyNotes ?? null,
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

/**
 * Writes a new ingredient's substitutes, each new link held to
 * `refuseUnlinkable`. `memberships` is the tier the ingredient is written in:
 * none for a compendium entry.
 *
 * @throws {ValidationError} a link the tier rule forbids, pathed to its entry.
 */
export async function addSubstitutes(
  write: AuditWriter,
  memberships: readonly Membership[],
  ingredientId: string,
  entries: readonly SubstituteEntry[],
) {
  await bringSubstitutesTo(write, memberships, ingredientId, entries, []);
}

/**
 * Brings the live substitutes to exactly `entries`, as `replaceFolkNames`
 * brings folk names (DESIGN.md §5, `ingredient_substitutes`): a link is
 * matched by the ingredient it links and a name as written, so an entry still
 * listed keeps its row, one dropped is soft-deleted, a new one is inserted, and
 * a list that changes nothing writes nothing. A link already held is kept
 * whether or not its ingredient is deleted; a new one is held to
 * `refuseUnlinkable`. `memberships` is the tier the parent is read in, as
 * `findManyOfIngredients` takes it: none for a compendium entry.
 *
 * @throws {ValidationError} a new link the tier rule forbids, pathed to its entry.
 */
export async function replaceSubstitutes(
  write: AuditWriter,
  memberships: readonly Membership[],
  ingredientId: string,
  entries: readonly SubstituteEntry[],
) {
  const current = await findManyOfIngredients(memberships, ingredientSubstitutes, [ingredientId]);
  await bringSubstitutesTo(write, memberships, ingredientId, entries, current);
}

/**
 * The diff both writes share. Dropped rows go first, so a name re-added in
 * another case clears the case-folded unique index.
 */
async function bringSubstitutesTo(
  write: AuditWriter,
  memberships: readonly Membership[],
  ingredientId: string,
  entries: readonly SubstituteEntry[],
  current: readonly (typeof ingredientSubstitutes.$inferSelect)[],
) {
  const listed = new Set(entries.map((entry) => keyOf(entry.ingredientId, entry.name)));
  const kept = new Set(current.map((row) => keyOf(row.substituteId, row.name)));

  await refuseUnlinkable(memberships, ingredientId, entries, kept);
  await write.softDeleteByIds(
    ingredientSubstitutes,
    current.filter((row) => !listed.has(keyOf(row.substituteId, row.name))).map((row) => row.id),
  );
  for (const { ingredientId: substituteId, name } of entries) {
    if (kept.has(keyOf(substituteId, name))) continue;
    await write.insert(ingredientSubstitutes, { ingredientId, substituteId, name });
  }
}

/** What makes two substitutes one: the ingredient linked, or else the name as written. */
function keyOf(linkedId: string | null, name: string | null): string {
  return linkedId ? `link:${linkedId}` : `name:${name}`;
}

/**
 * Refuses each new link the tier rule forbids (DESIGN.md §5, "A substitute
 * links only what its ingredient's readers may read"): the linked id must be
 * a live ingredient the writer's own scope reads — the compendium, and the
 * proof's coven for a coven write — and not the ingredient itself. An id that
 * names nothing reads as one in another coven does, since that coven's
 * contents are private. A link already in `kept` is not checked again.
 *
 * @throws {ValidationError} one issue per refused entry, pathed to it.
 */
async function refuseUnlinkable(
  memberships: readonly Membership[],
  ingredientId: string,
  entries: readonly SubstituteEntry[],
  kept: ReadonlySet<string>,
): Promise<void> {
  const unlinkable =
    memberships.length === 0
      ? 'No compendium entry to link — a compendium entry’s substitute links only the compendium'
      : 'No ingredient to link — choose one from the compendium or this coven';
  const checks = entries.map(async (entry, index): Promise<ValidationIssue | undefined> => {
    if (entry.ingredientId === null || kept.has(keyOf(entry.ingredientId, null))) return undefined;
    const path = ['substitutes', index];
    if (entry.ingredientId === ingredientId) {
      return { path, message: 'An ingredient cannot be its own substitute' };
    }
    const target = await findOneIngredient(memberships, entry.ingredientId);
    return target ? undefined : { path, message: unlinkable };
  });
  const issues = (await Promise.all(checks)).filter((issue) => issue !== undefined);
  if (issues.length > 0) throw new ValidationError(issues);
}

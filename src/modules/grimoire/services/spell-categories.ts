import 'server-only';
import { findManyByIds, findManyInSpell, type AuditWriter } from '../../../db/repository';
import { spellCategories } from '../schema/spell-categories';
import { ValidationError } from '../../../lib/errors';
import type { ValidationIssue } from '../../../lib/types';
import type { Membership } from '@/modules/coven';
import { categories } from '@/modules/vocabulary/schema/categories';

// How a save writes the categories a spell is assigned: what it intends, never the ones its ingredients bring.
// The ids a save sends are the whole set; the pairs are reached through the spell (claude-docs/db/grimoire.md, "Grimoire service and schema details").

/** A category picked twice is one, so the set is written once. */
const distinctIds = (ids: readonly string[]): string[] => [...new Set(ids)];

/**
 * Refuses an id that names no live category, at its index, before anything is
 * written: a category deleted since the builder loaded, or one that never was.
 *
 * @throws {ValidationError} at `['categoryIds', index]` for each such id.
 */
export async function checkCategories(ids: readonly string[]): Promise<void> {
  const live = new Set((await findManyByIds(categories, distinctIds(ids))).map((row) => row.id));
  const issues: ValidationIssue[] = [];
  ids.forEach((id, index) => {
    if (live.has(id)) return;
    issues.push({
      path: ['categoryIds', index],
      message: 'No such category to file it under — choose one from the list',
    });
  });
  if (issues.length > 0) throw new ValidationError(issues);
}

/** The pairs a spell holds now, read as the caller, before the save's transaction. */
export async function heldCategories(membership: Membership, spellId: string): Promise<string[]> {
  return (await findManyInSpell(membership, spellCategories, spellId)).map(
    (pair) => pair.categoryId,
  );
}

/**
 * Brings the spell's pairs to exactly `ids`: a listed pair is kept, a dropped one hard-deleted, a new one inserted.
 * A pair whose category is soft-deleted is left in place.
 */
export async function writeCategories(
  write: AuditWriter,
  spellId: string,
  ids: readonly string[],
  held: readonly string[],
): Promise<void> {
  const shown = new Set((await findManyByIds(categories, [...held])).map((row) => row.id));
  const listed = new Set(ids);
  await write.delete(spellCategories, {
    spellId,
    categoryId: held.filter((id) => shown.has(id) && !listed.has(id)),
  });
  for (const categoryId of distinctIds(ids).filter((id) => !held.includes(id))) {
    await write.insert(spellCategories, { spellId, categoryId });
  }
}

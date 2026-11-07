import 'server-only';
import { findManyByIds, findManyInSpell, type AuditWriter } from '../../../db/repository';
import { spellCategories } from '../schema/spell-categories';
import { ValidationError } from '../../../lib/errors';
import type { ValidationIssue } from '../../../lib/types';
import type { Membership } from '@/modules/coven';
import { categories } from '@/modules/vocabulary/schema/categories';

// The ids a save sends are the whole set; the pairs are reached through the spell (claude-docs/db/grimoire.md, "Grimoire service and schema details").

const distinctIds = (ids: readonly string[]): string[] => [...new Set(ids)];

/**
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

export async function heldCategories(membership: Membership, spellId: string): Promise<string[]> {
  return (await findManyInSpell(membership, spellCategories, spellId)).map(
    (pair) => pair.categoryId,
  );
}

/** A pair whose category is soft-deleted is left in place. */
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

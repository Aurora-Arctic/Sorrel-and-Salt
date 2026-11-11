import 'server-only';
import { findCategoryPage, findGroupCount, findGroupPage } from '../../../db/repository';
import { expireCompendium } from '../../../lib/compendium-cache';
import { allPages } from '../../../lib/pagination';
import type { Session } from '../../../lib/session';
import { slugify } from '../../../lib/slugify';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { parseInput } from '../../../lib/validation';
import { assertCurator } from '@/modules/identity';
import { categories, categoryGroups } from '../schema/categories';
import { CategoryGroupInput } from '../validation/category-group';
import { bySlug, createCurated, deleteGroup, updateGroup } from './curated-writes';
import type { CategoryGroupRow, CuratedGroup } from '../types';

/** The groups, and the categories filed under them, which a delete moves and a rename leaves alone: a category's slug is its own name alone. */
const GROUPS: CuratedGroup<typeof categoryGroups> = {
  table: categoryGroups,
  slugIndex: 'category_groups_slug_unique',
  noun: 'group',
  members: {
    table: categories,
    slugIndex: 'categories_slug_unique',
    noun: 'category',
    nouns: 'categories',
    parentColumn: 'groupId',
    under: (groupId) => allPages((page) => findCategoryPage({ groupId }, page)),
  },
};

export function listCategoryGroups(page: PageRequest): Promise<PageEntry<CategoryGroupRow>[]> {
  return findGroupPage(categoryGroups, {}, page);
}

export function countCategoryGroups(start: Cursor | undefined): Promise<PageCount> {
  return findGroupCount(categoryGroups, {}, start);
}

/**
 * @throws {NotFound} no live group holds the slug.
 */
export async function getCategoryGroupBySlug(slug: string): Promise<CategoryGroupRow> {
  return bySlug(GROUPS, slug);
}

/**
 * @throws {Forbidden} the caller is neither a curator nor a keeper.
 * @throws {ValidationError} the input breaks `CategoryGroupInput` (a colour under the floor on its own column), or its slug is a live group's.
 */
export async function createCategoryGroup(
  session: Session,
  input: CategoryGroupInput,
): Promise<CategoryGroupRow> {
  assertCurator(session);
  const fields = parseInput(CategoryGroupInput, input);
  return createCurated(session, GROUPS, fields, slugify(fields.name));
}

/**
 * Rewrites a category group whole, its slug following the name; no category is touched. Its `seedKey` is left as it was.
 *
 * @throws {Forbidden} the caller is neither a curator nor a keeper.
 * @throws {ValidationError} as `createCategoryGroup` throws it, the row's own slug excepted.
 * @throws {NotFound} no live group has this id.
 */
export async function updateCategoryGroup(
  session: Session,
  id: string,
  input: CategoryGroupInput,
): Promise<CategoryGroupRow> {
  assertCurator(session);
  const fields = parseInput(CategoryGroupInput, input);
  const written = await updateGroup(session, GROUPS, id, fields);
  expireCompendium();
  return written;
}

/**
 * Soft-deletes a category group, first moving its live categories to the group `moveTo` names (claude-docs/db/categories.md,
 * "Category group service details").
 *
 * @throws {Forbidden} the caller is neither a curator nor a keeper.
 * @throws {ValidationError} on `moveTo`, the group has live categories and `moveTo` names no other live group.
 * @throws {NotFound} no live group has this id.
 */
export async function deleteCategoryGroup(
  session: Session,
  id: string,
  moveTo?: string,
): Promise<void> {
  assertCurator(session);
  await deleteGroup(session, GROUPS, id, moveTo);
  expireCompendium();
}

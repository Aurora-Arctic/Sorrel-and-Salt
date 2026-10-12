import 'server-only';
import {
  findCategoryPage,
  findOneBySlug,
  findPage,
  findPageCount,
  withAudit,
} from '../../../db/repository';
import { expireCompendium } from '../../../lib/compendium-cache';
import { NotFound } from '../../../lib/errors';
import { allPages } from '../../../lib/pagination';
import type { Session } from '../../../lib/session';
import { slugify } from '../../../lib/slugify';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { parseInput } from '../../../lib/validation';
import { assertSiteAdmin } from '@/modules/identity';
import { categories, categoryGroups } from '../schema/categories';
import { CategoryGroupInput } from '../validation/category-group';
import { deleteGroup, refuseSlugCollision, updateGroup } from './curated-writes';
import type { CategoryGroupRow, CuratedGroup } from '../types';

// The category groups: their reads, public reference data like every curated
// vocabulary (MB.80), and their writes, the site admin's alone (M5.6b). Each
// colour is held to 4.5:1 against its own theme's harder surface by the input
// schema (MB.36). A group is deleted only once its live categories have
// somewhere to go — the admin names a group and they move there in the same
// write — since a category under a deleted group is read by nothing yet still
// holds its address (claude-docs/design-decisions/m5.6b-admin-groups.md).

/**
 * The groups, and the categories filed under them, which a delete moves and a
 * rename leaves alone: a category's slug is its own name alone.
 */
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

/** One page of the live category groups, alphabetical by name (MB.35): the group a category is filed under is picked from these. */
export function listCategoryGroups(page: PageRequest): Promise<PageEntry<CategoryGroupRow>[]> {
  return findPage(categoryGroups, [categoryGroups.name], page);
}

/**
 * How many live category groups `listCategoryGroups` pages, and how many come before `start`
 * — a page's first row, none on an empty page: "Page X of Y" on the admin page.
 */
export function countCategoryGroups(start: Cursor | undefined): Promise<PageCount> {
  return findPageCount(categoryGroups, [categoryGroups.name], start);
}

/**
 * The live group at this address — how the admin page opens one to edit.
 *
 * @throws {NotFound} no live group holds the slug.
 */
export async function getCategoryGroupBySlug(slug: string): Promise<CategoryGroupRow> {
  const row = await findOneBySlug(categoryGroups, slug);
  if (!row) throw new NotFound('No such group');
  return row;
}

/**
 * Adds a category group, its slug derived from the name.
 *
 * @throws {Forbidden} the caller is not a site admin — checked before the
 * input is read.
 * @throws {ValidationError} the input breaks `CategoryGroupInput` — a colour
 * under the floor on its own column — or its slug is a live group's.
 */
export async function createCategoryGroup(
  session: Session,
  input: CategoryGroupInput,
): Promise<CategoryGroupRow> {
  assertSiteAdmin(session);
  const fields = parseInput(CategoryGroupInput, input);
  const slug = slugify(fields.name);

  const written = await withAudit(session, async (write) => {
    const [row] = await write.insert(categoryGroups, { ...fields, slug });
    return row;
  }).catch((error: unknown) => refuseSlugCollision(GROUPS, error, slug));
  expireCompendium();
  return written;
}

/**
 * Rewrites a category group whole, its slug following the name. Touches no
 * category: a category's slug is its own name alone. Its `seedKey` is left as
 * it was, so a renamed seeded row is still the seed's (MB.171).
 *
 * @throws {Forbidden} the caller is not a site admin.
 * @throws {ValidationError} as `createCategoryGroup` throws it, the row's own
 * slug excepted.
 * @throws {NotFound} no live group has this id.
 */
export async function updateCategoryGroup(
  session: Session,
  id: string,
  input: CategoryGroupInput,
): Promise<CategoryGroupRow> {
  assertSiteAdmin(session);
  const fields = parseInput(CategoryGroupInput, input);
  const written = await updateGroup(session, GROUPS, id, fields);
  expireCompendium();
  return written;
}

/**
 * Soft-deletes a category group, first moving its live categories to the
 * group `moveTo` names, in the same transaction; their slugs and every link
 * to them, a compendium entry's or a coven's, stay as they were. A group with
 * no live category needs no `moveTo`.
 *
 * The categories are read before the transaction, so one filed under the
 * group in the instant between is left under a deleted one, which every read
 * drops, as a category's own delete leaves an entry filed under it.
 *
 * @throws {Forbidden} the caller is not a site admin.
 * @throws {ValidationError} on `moveTo`, the group has live categories and
 * `moveTo` names no other live group.
 * @throws {NotFound} no live group has this id.
 */
export async function deleteCategoryGroup(
  session: Session,
  id: string,
  moveTo?: string,
): Promise<void> {
  assertSiteAdmin(session);
  await deleteGroup(session, GROUPS, id, moveTo);
  expireCompendium();
}

import 'server-only';
import {
  findCategoryCount,
  findCategoryPage,
  findOneById,
  findOneBySlug,
  withAudit,
} from '../../../db/repository';
import { cachedCompendiumRead, expireCompendium } from '../../../lib/compendium-cache';
import { Forbidden, NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { slugify } from '../../../lib/slugify';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { RowId, parseInput } from '../../../lib/validation';
import { assertSiteAdmin } from '@/modules/identity';
import { categories, categoryGroups } from '../schema/categories';
import { CategoryInput } from '../validation/category';
import { heldBy } from './held-entries';
import type { CategoryFilter, CategoryRow } from '../types';

// The category vocabulary: its reads, public reference data like every
// curated vocabulary (MB.80), and its writes, the site admin's alone (M5.6).
// A delete leaves every link in place and every read drops a deleted
// category; it is refused only while a live compendium entry is filed under
// it (claude-docs/db/categories.md, "Category writes").

// The list and its count, held in the data cache under the `compendium` tag
// (claude-docs/db/compendium-cache.md).
const cachedPage = cachedCompendiumRead('category-page', findCategoryPage);
const cachedCount = cachedCompendiumRead('category-count', findCategoryCount);

/**
 * One page of the live categories under `filter`, by group then name, each under a live
 * group: the `categories` query, and the admin page's list. A blank query is
 * no query, and a group id that is not a uuid names no group, so lists nothing.
 */
export async function listCategories(
  filter: CategoryFilter,
  page: PageRequest,
): Promise<PageEntry<CategoryRow>[]> {
  const read = readable(filter);
  return read ? cachedPage(read, page) : [];
}

/**
 * How many categories `listCategories` pages under `filter`, and how many
 * come before `start` — a page's first row, none on an empty page: "Page X
 * of Y".
 */
export async function countCategories(
  filter: CategoryFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  const read = readable(filter);
  return read ? cachedCount(read, start) : { totalCount: 0, countBefore: null };
}

/**
 * The live category at this address — how the admin page opens one to edit.
 *
 * @throws {NotFound} no live category holds the slug.
 */
export async function getCategoryBySlug(slug: string): Promise<CategoryRow> {
  const row = await findOneBySlug(categories, slug);
  if (!row) throw new NotFound('No such category');
  return row;
}

/**
 * Adds a category, its slug derived from the name.
 *
 * @throws {Forbidden} the caller is not a site admin — checked before the
 * input is read.
 * @throws {ValidationError} the input breaks `CategoryInput`, names no live
 * group, or its slug is a live category's.
 */
export async function createCategory(session: Session, input: CategoryInput): Promise<CategoryRow> {
  assertSiteAdmin(session);
  const fields = await parseCategory(input);
  const slug = slugify(fields.name);

  const written = await withAudit(session, async (write) => {
    const [row] = await write.insert(categories, { ...fields, slug });
    return row;
  }).catch((error: unknown) => refuseCollision(error, slug));
  expireCompendium();
  return written;
}

/**
 * Rewrites a category whole, its slug following the name. Its `seedKey` is
 * left as it was, so a renamed seeded row is still the seed's (MB.171).
 *
 * @throws {Forbidden} the caller is not a site admin.
 * @throws {ValidationError} as `createCategory` throws it, the row's own slug
 * excepted.
 * @throws {NotFound} no live category has this id.
 */
export async function updateCategory(
  session: Session,
  id: string,
  input: CategoryInput,
): Promise<CategoryRow> {
  assertSiteAdmin(session);
  const fields = await parseCategory(input);
  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  if (!RowId.safeParse(id).success) throw new NotFound('No such category');
  const slug = slugify(fields.name);

  const written = await withAudit(session, async (write) => {
    const [row] = await write.updateById(categories, id, { ...fields, slug });
    if (!row) throw new NotFound('No such category');
    return row;
  }).catch((error: unknown) => refuseCollision(error, slug));
  expireCompendium();
  return written;
}

/**
 * Soft-deletes a category nothing in the compendium is filed under. A coven's
 * ingredient or spell keeps its link, and stops reading the category — the
 * links are the coven's, and an admin writes nothing of a coven's (M6.6).
 *
 * The entries are read before the transaction, so an entry filed under the
 * category in the instant between is left holding a deleted one, which every
 * read drops.
 *
 * @throws {Forbidden} the caller is not a site admin, or a live compendium
 * entry is filed under the category — the message names the entries.
 * @throws {NotFound} no live category has this id.
 */
export async function deleteCategory(session: Session, id: string): Promise<void> {
  assertSiteAdmin(session);
  if (!RowId.safeParse(id).success) throw new NotFound('No such category');
  const category = await findOneById(categories, id);
  if (!category) throw new NotFound('No such category');
  await refuseWhileFiled(category);

  await withAudit(session, async (write) => {
    const [row] = await write.softDeleteByIds(categories, [id]);
    if (!row) throw new NotFound('No such category');
  });
  expireCompendium();
}

/**
 * The filter as the repository reads it, its query trimmed and a blank one
 * dropped; `undefined` for a group id that is not a uuid, which names nothing
 * and would be a driver error at the comparison.
 */
function readable({ query, groupId }: CategoryFilter): CategoryFilter | undefined {
  if (groupId !== undefined && !RowId.safeParse(groupId).success) return undefined;
  return { query: query?.trim() || undefined, groupId };
}

/** The input parsed, its group checked live: a foreign key admits a retired one. */
async function parseCategory(input: CategoryInput): Promise<CategoryInput> {
  const fields = parseInput(CategoryInput, input);
  const group = await findOneById(categoryGroups, fields.groupId);
  if (!group) throw new ValidationError([{ path: ['groupId'], message: 'Choose a group' }]);
  return fields;
}

/**
 * The refusal of a delete while live compendium entries are filed under the
 * category: the first few by name, each told apart from a namesake, and how
 * many more, read through the compendium's own category filter.
 */
async function refuseWhileFiled(category: CategoryRow): Promise<void> {
  const held = await heldBy({ categoryIds: [category.id] });
  if (!held) return;
  const { totalCount, list } = held;
  const entries = totalCount === 1 ? 'entry' : 'entries';
  const them = totalCount === 1 ? 'it' : 'them';
  throw new Forbidden(
    `"${category.name}" is filed on ${totalCount} compendium ${entries} — ${list}. Take it off ${them} first.`,
  );
}

/**
 * A write that broke the slug index, as a `ValidationError` on `name` — the
 * slug is derived and has no field of its own (MB.43) — naming the category
 * holding the address; any other error unchanged.
 */
async function refuseCollision(error: unknown, slug: string): Promise<never> {
  if (violatedUniqueIndex(error) === 'categories_slug_unique') {
    const holder = await findOneBySlug(categories, slug);
    throw new ValidationError([
      {
        path: ['name'],
        message: `${holder ? `"${holder.name}"` : 'Another category'} already has the address "${slug}" — choose another name`,
      },
    ]);
  }
  throw error;
}

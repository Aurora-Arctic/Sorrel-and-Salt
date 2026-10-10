import 'server-only';
import {
  findCategoryCount,
  findCategoryPage,
  findOneBySlug,
  withAudit,
} from '../../../db/repository';
import { cachedCompendiumRead, expireCompendium } from '../../../lib/compendium-cache';
import { NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { slugify } from '../../../lib/slugify';
import { plural } from '../../../lib/text';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { assertSiteAdmin } from '@/modules/identity';
import { categories, categoryGroups } from '../schema/categories';
import { CategoryInput } from '../validation/category';
import { cachedFilteredList } from './curated-lists';
import { liveRow, parseUnderLiveParent, refuseSlugCollision } from './curated-writes';
import { refuseWhileHeld } from './held-entries';
import type { CategoryFilter, CategoryRow, CuratedVocabulary } from '../types';

// The category vocabulary: its reads, public reference data like every
// curated vocabulary (MB.80), and its writes, the site admin's alone (M5.6).
// A delete leaves every link in place and every read drops a deleted
// category; it is refused only while a live compendium entry is filed under
// it (claude-docs/db/categories.md, "Category writes").

// The list and its count, held in the data cache under the `compendium` tag
// (claude-docs/db/compendium-cache.md).
const cachedPage = cachedCompendiumRead('category-page', findCategoryPage);
const cachedCount = cachedCompendiumRead('category-count', findCategoryCount);
const list = cachedFilteredList(cachedPage, cachedCount, 'groupId');

/** A category's slug is its name alone, so a collision is cured by renaming it. */
const CATEGORIES: CuratedVocabulary<typeof categories> = {
  table: categories,
  slugIndex: 'categories_slug_unique',
  noun: 'category',
};

/**
 * One page of the live categories under `filter`, by group then name, each under a live
 * group: the `categories` query, and the admin page's list. A blank query is
 * no query, and a group id that is not a uuid names no group, so lists nothing.
 */
export function listCategories(
  filter: CategoryFilter,
  page: PageRequest,
): Promise<PageEntry<CategoryRow>[]> {
  return list.list(filter, page);
}

/**
 * How many categories `listCategories` pages under `filter`, and how many
 * come before `start` — a page's first row, none on an empty page: "Page X
 * of Y".
 */
export function countCategories(
  filter: CategoryFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  return list.count(filter, start);
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
  }).catch((error: unknown) => refuseSlugCollision(CATEGORIES, error, slug));
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
  await liveRow(CATEGORIES, id);
  const slug = slugify(fields.name);

  const written = await withAudit(session, async (write) => {
    const [row] = await write.updateById(categories, id, { ...fields, slug });
    if (!row) throw new NotFound('No such category');
    return row;
  }).catch((error: unknown) => refuseSlugCollision(CATEGORIES, error, slug));
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
  const category = await liveRow(CATEGORIES, id);
  await refuseWhileHeld(
    { categoryIds: [category.id] },
    {
      name: category.name,
      holding: 'is filed on',
      remedy: (count) => `Take it off ${plural(count, 'it', 'them')} first.`,
    },
  );

  await withAudit(session, async (write) => {
    const [row] = await write.softDeleteByIds(categories, [id]);
    if (!row) throw new NotFound('No such category');
  });
  expireCompendium();
}

/** The input parsed, its group checked live: a foreign key admits a retired one. */
async function parseCategory(input: CategoryInput): Promise<CategoryInput> {
  const { fields } = await parseUnderLiveParent(CategoryInput, input, {
    table: categoryGroups,
    column: 'groupId',
    refusal: 'Choose a group',
  });
  return fields;
}

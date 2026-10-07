import 'server-only';
import {
  findCategoryCount,
  findCategoryPage,
  findCompendiumCount,
  findCompendiumPage,
  findOneById,
  findOneBySlug,
  findPage,
  withAudit,
} from '../../../db/repository';
import { Forbidden, NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { slugify } from '../../../lib/slugify';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { RowId, parseInput } from '../../../lib/validation';
import { assertSiteAdmin } from '@/modules/identity';
import { categories, categoryGroups } from '../schema/categories';
import { CategoryInput } from '../validation/category';
import type { CategoryGroupRow, CategoryRow } from '../types';

// The category vocabulary: its reads, public reference data like every
// curated vocabulary (MB.80), and its writes, the site admin's alone (M5.6).
// A delete leaves every link in place and every read drops a deleted
// category; it is refused only while a live compendium entry is filed under
// it (claude-docs/db/categories.md, "Category writes").

/** How many entries a refused delete names before it counts the rest. */
const ENTRIES_NAMED = 3;

/**
 * One page of the live categories, by name, each under a live group: the
 * `categories` query, and the admin page's list.
 */
export function listCategories(page: PageRequest): Promise<PageEntry<CategoryRow>[]> {
  return findCategoryPage(page);
}

/**
 * How many categories `listCategories` pages, and how many come before
 * `start` — a page's first row, none on an empty page: "Page X of Y".
 */
export function countCategories(start: Cursor | undefined): Promise<PageCount> {
  return findCategoryCount(start);
}

/** One page of the live category groups, alphabetical by name (MB.35): the group a category is filed under is picked from these. */
export function listCategoryGroups(page: PageRequest): Promise<PageEntry<CategoryGroupRow>[]> {
  return findPage(categoryGroups, [categoryGroups.name], page);
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

  return withAudit(session, async (write) => {
    const [row] = await write.insert(categories, { ...fields, slug });
    return row;
  }).catch((error: unknown) => refuseCollision(error, slug));
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

  return withAudit(session, async (write) => {
    const [row] = await write.updateById(categories, id, { ...fields, slug });
    if (!row) throw new NotFound('No such category');
    return row;
  }).catch((error: unknown) => refuseCollision(error, slug));
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
 * many more. Read through the
 * compendium's own category filter, so "filed under" means what the
 * compendium's list means by it.
 */
async function refuseWhileFiled(category: CategoryRow): Promise<void> {
  const filter = { categoryIds: [category.id] };
  const { totalCount } = await findCompendiumCount(filter, undefined);
  if (totalCount === 0) return;
  const named = await findCompendiumPage(filter, { limit: ENTRIES_NAMED, inverted: false });
  const names = named.map(({ node }) => describeEntry(node));
  const rest = totalCount - names.length;
  const list =
    rest > 0
      ? `${names.join(', ')} and ${rest} more`
      : names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  const entries = totalCount === 1 ? 'entry' : 'entries';
  const them = totalCount === 1 ? 'it' : 'them';
  throw new Forbidden(
    `"${category.name}" is filed on ${totalCount} compendium ${entries} — ${list}. Take it off ${them} first.`,
  );
}

/**
 * An entry as a person tells it apart, as the compendium's own refusals name
 * one: its label, then its formal name and form — two entries may share a
 * label.
 */
function describeEntry(entry: {
  name: string;
  canonicalName: string | null;
  form: string | null;
}): string {
  const identity = [entry.canonicalName, entry.form].filter(Boolean).join(', ');
  return identity ? `${entry.name} (${identity})` : entry.name;
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

import 'server-only';
import {
  findIngredientFormValues,
  findOneBySlug,
  findPage,
  findPageCount,
  withAudit,
} from '../../../db/repository';
import { expireCompendium } from '../../../lib/compendium-cache';
import { NotFound } from '../../../lib/errors';
import { allPages } from '../../../lib/pagination';
import type { Session } from '../../../lib/session';
import { formSlug, slugify } from '../../../lib/slugify';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { parseInput } from '../../../lib/validation';
import { assertSiteAdmin } from '@/modules/identity';
import { ingredientFormGroups, ingredientForms } from '../schema/ingredient-forms';
import { IngredientFormGroupInput } from '../validation/ingredient-form-group';
import { deleteGroup, refuseSlugCollision, updateGroup } from './curated-writes';
import type { CuratedGroup, IngredientFormGroupRow } from '../types';

// The ingredient form groups: their reads, public reference data like every
// curated vocabulary (MB.80), and their writes, the site admin's alone
// (M5.6b). A form's slug is its name and its group (M5.6a), so a rename moves
// every live form's slug under the group, and a delete first moves its live
// forms to the group the admin names, each re-slugged there. The forms stay
// curated either way, so no compendium entry's pick, nor a coven's, is
// orphaned, and no ingredient is rewritten: an ingredient holds a form's name,
// not its slug (claude-docs/design-decisions/m5.6b-admin-groups.md).

/** The form groups, and the forms under them, which a rename or delete re-slugs under the group's name. */
const GROUPS: CuratedGroup<typeof ingredientFormGroups> = {
  table: ingredientFormGroups,
  slugIndex: 'ingredient_form_groups_slug_unique',
  noun: 'group',
  members: {
    table: ingredientForms,
    slugIndex: 'ingredient_forms_slug_unique',
    noun: 'form',
    nouns: 'forms',
    parentColumn: 'groupId',
    slugOf: formSlug,
    under: (groupId) => allPages((page) => findIngredientFormValues({ groupId }, page)),
  },
};
/** One page of the live form groups, alphabetical by name (MB.35): a form's group is picked from these. */
export function listIngredientFormGroups(
  page: PageRequest,
): Promise<PageEntry<IngredientFormGroupRow>[]> {
  return findPage(ingredientFormGroups, [ingredientFormGroups.name], page);
}

/**
 * How many live form groups `listIngredientFormGroups` pages, and how many come before `start`
 * — a page's first row, none on an empty page: "Page X of Y" on the admin page.
 */
export function countIngredientFormGroups(start: Cursor | undefined): Promise<PageCount> {
  return findPageCount(ingredientFormGroups, [ingredientFormGroups.name], start);
}

/**
 * The live form group at this address — how the admin page opens one to edit.
 *
 * @throws {NotFound} no live group holds the slug.
 */
export async function getIngredientFormGroupBySlug(slug: string): Promise<IngredientFormGroupRow> {
  const row = await findOneBySlug(ingredientFormGroups, slug);
  if (!row) throw new NotFound('No such group');
  return row;
}

/**
 * Adds a form group, its slug derived from the name.
 *
 * @throws {Forbidden} the caller is not a site admin — checked before the
 * input is read.
 * @throws {ValidationError} the input breaks `IngredientFormGroupInput`, or
 * its slug is a live group's.
 */
export async function createIngredientFormGroup(
  session: Session,
  input: IngredientFormGroupInput,
): Promise<IngredientFormGroupRow> {
  assertSiteAdmin(session);
  const fields = parseInput(IngredientFormGroupInput, input);
  const slug = slugify(fields.name);

  const written = await withAudit(session, async (write) => {
    const [row] = await write.insert(ingredientFormGroups, { ...fields, slug });
    return row;
  }).catch((error: unknown) => refuseSlugCollision(GROUPS, error, slug));
  expireCompendium();
  return written;
}

/**
 * Rewrites a form group whole, its slug following the name, and on a rename
 * the slug of every live form under it, in the same transaction. Its
 * `seedKey` is left as it was, so a renamed seeded row is still the seed's
 * (MB.171).
 *
 * The forms are read before the transaction, so one added under the group in
 * the instant between keeps the slug it was given.
 *
 * @throws {Forbidden} the caller is not a site admin.
 * @throws {ValidationError} as `createIngredientFormGroup` throws it, the
 * row's own slug excepted; on `name`, a rename that would move a form onto
 * another form's address, naming both.
 * @throws {NotFound} no live group has this id.
 */
export async function updateIngredientFormGroup(
  session: Session,
  id: string,
  input: IngredientFormGroupInput,
): Promise<IngredientFormGroupRow> {
  assertSiteAdmin(session);
  const fields = parseInput(IngredientFormGroupInput, input);
  const written = await updateGroup(session, GROUPS, id, fields);
  expireCompendium();
  return written;
}

/**
 * Soft-deletes a form group, first moving its live forms to the group
 * `moveTo` names, each re-slugged under it, in the same transaction. A group
 * with no live form needs no `moveTo`.
 *
 * The forms are read before the transaction, so one added under the group in
 * the instant between is left under a deleted one, which reads as uncurated.
 *
 * @throws {Forbidden} the caller is not a site admin.
 * @throws {ValidationError} on `moveTo`, the group has live forms and
 * `moveTo` names no other live group, or a form would move onto another
 * form's address, naming both.
 * @throws {NotFound} no live group has this id.
 */
export async function deleteIngredientFormGroup(
  session: Session,
  id: string,
  moveTo?: string,
): Promise<void> {
  assertSiteAdmin(session);
  await deleteGroup(session, GROUPS, id, moveTo);
  expireCompendium();
}

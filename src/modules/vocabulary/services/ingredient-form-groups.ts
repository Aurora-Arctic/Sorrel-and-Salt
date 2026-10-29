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
import { assertCurator } from '@/modules/identity';
import { ingredientFormGroups, ingredientForms } from '../schema/ingredient-forms';
import { IngredientFormGroupInput } from '../validation/ingredient-form-group';
import { deleteGroup, refuseSlugCollision, updateGroup } from './curated-writes';
import type { CuratedGroup, IngredientFormGroupRow } from '../types';

// The ingredient form groups: public reads, and writes for a curator or an admin alone. A rename or delete re-slugs the forms
// under them (claude-docs/db/form-vocabulary-seed.md, "Form group service details").

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
/** One page of the live form groups, alphabetical by name: a form's group is picked from these. */
export function listIngredientFormGroups(
  page: PageRequest,
): Promise<PageEntry<IngredientFormGroupRow>[]> {
  return findPage(ingredientFormGroups, [ingredientFormGroups.name], page);
}

/** How many live form groups `listIngredientFormGroups` pages, and how many come before `start`: "Page X of Y". */
export function countIngredientFormGroups(start: Cursor | undefined): Promise<PageCount> {
  return findPageCount(ingredientFormGroups, [ingredientFormGroups.name], start);
}

/**
 * The live form group at this address, for the admin page to edit.
 *
 * @throws {NotFound} no live group holds the slug.
 */
export async function getIngredientFormGroupBySlug(slug: string): Promise<IngredientFormGroupRow> {
  const row = await findOneBySlug(ingredientFormGroups, slug);
  if (!row) throw new NotFound('No such group');
  return row;
}

/**
 * Adds a form group, its slug derived from the name, and with no icon the generic one.
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {ValidationError} the input breaks `IngredientFormGroupInput`, or its slug is a live group's.
 */
export async function createIngredientFormGroup(
  session: Session,
  input: IngredientFormGroupInput,
): Promise<IngredientFormGroupRow> {
  assertCurator(session);
  const fields = parseInput(IngredientFormGroupInput, input);
  const slug = slugify(fields.name);

  const written = await withAudit(session, async (write) => {
    const [row] = await write.insert(ingredientFormGroups, {
      ...fields,
      icon: fields.icon ?? null,
      slug,
    });
    return row;
  }).catch((error: unknown) => refuseSlugCollision(GROUPS, error, slug));
  expireCompendium();
  return written;
}

/**
 * Rewrites a form group whole, its slug following the name and its icon cleared when the input carries none, and on a rename the
 * slug of every live form under it (claude-docs/db/form-vocabulary-seed.md, "Form group service details"). Its `seedKey` is left as it was.
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {ValidationError} as `createIngredientFormGroup` throws it, the row's own slug excepted; on `name`, a rename that would move a form onto another's address.
 * @throws {NotFound} no live group has this id.
 */
export async function updateIngredientFormGroup(
  session: Session,
  id: string,
  input: IngredientFormGroupInput,
): Promise<IngredientFormGroupRow> {
  assertCurator(session);
  const fields = parseInput(IngredientFormGroupInput, input);
  // Written whole, so an input without an icon clears the one held: GraphQL's
  // `definedArgs` hands `icon: null` over as absent, and absent is how it clears.
  const written = await updateGroup(session, GROUPS, id, { ...fields, icon: fields.icon ?? null });
  expireCompendium();
  return written;
}

/**
 * Soft-deletes a form group, first moving its live forms to the group `moveTo` names (claude-docs/db/form-vocabulary-seed.md,
 * "Form group service details").
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {ValidationError} on `moveTo`, a missing target or a form that would move onto another's address.
 * @throws {NotFound} no live group has this id.
 */
export async function deleteIngredientFormGroup(
  session: Session,
  id: string,
  moveTo?: string,
): Promise<void> {
  assertCurator(session);
  await deleteGroup(session, GROUPS, id, moveTo);
  expireCompendium();
}

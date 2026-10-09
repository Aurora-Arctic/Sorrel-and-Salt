import 'server-only';
import {
  findIngredientFormValues,
  findOneById,
  findOneBySlug,
  findPage,
  findPageCount,
  withAudit,
} from '../../../db/repository';
import { NotFound, ValidationError } from '../../../lib/errors';
import { MAX_PAGE_SIZE } from '../../../lib/pagination';
import type { Session } from '../../../lib/session';
import { formSlug, slugify } from '../../../lib/slugify';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { RowId, parseInput } from '../../../lib/validation';
import { assertSiteAdmin } from '@/modules/identity';
import { ingredientFormGroups, ingredientForms } from '../schema/ingredient-forms';
import { IngredientFormGroupInput } from '../validation/ingredient-form-group';
import { refusal, refuseCollidingMoves } from './group-moves';
import type {
  GroupMove,
  IngredientFormGroupRow,
  IngredientFormValueRow,
  MovedRows,
} from '../types';

/** The forms a group's rename or delete moves, re-slugged under its name. */
const FORMS: MovedRows = {
  table: ingredientForms,
  slugIndex: 'ingredient_forms_slug_unique',
  noun: 'form',
};

// The ingredient form groups: their reads, public reference data like every
// curated vocabulary (MB.80), and their writes, the site admin's alone
// (M5.6b). A form's slug is its name and its group (M5.6a), so a rename moves
// every live form's slug under the group, and a delete first moves its live
// forms to the group the admin names, each re-slugged there. The forms stay
// curated either way, so no compendium entry's pick, nor a coven's, is
// orphaned, and no ingredient is rewritten: an ingredient holds a form's name,
// not its slug (claude-docs/design-decisions/m5.6b-admin-groups.md).

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

  return withAudit(session, async (write) => {
    const [row] = await write.insert(ingredientFormGroups, { ...fields, slug });
    return row;
  }).catch((error: unknown) => refuseCollision(error, slug));
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
  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  if (!RowId.safeParse(id).success) throw new NotFound('No such group');
  const current = await findOneById(ingredientFormGroups, id);
  if (!current) throw new NotFound('No such group');
  const slug = slugify(fields.name);
  const moves = current.name === fields.name ? [] : await formsMoved(id, fields.name);
  const refuse = refusal(
    FORMS,
    ['name'],
    (form) => `Renaming the group would move "${form.name}" to`,
  );
  await refuseCollidingMoves(FORMS, moves, refuse);

  return withAudit(session, async (write) => {
    const [row] = await write.updateById(ingredientFormGroups, id, { ...fields, slug });
    if (!row) throw new NotFound('No such group');
    for (const { row: form, slug: moved } of moves) {
      await write.updateById(ingredientForms, form.id, { slug: moved });
    }
    return row;
  }).catch(async (error: unknown) => {
    await refuseCollidingMoves(FORMS, moves, refuse, error);
    return refuseCollision(error, slug);
  });
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
  if (!RowId.safeParse(id).success) throw new NotFound('No such group');
  const group = await findOneById(ingredientFormGroups, id);
  if (!group) throw new NotFound('No such group');
  const forms = await formsUnder(id);
  let moves: GroupMove[] = [];
  if (forms.length > 0) {
    const target = await moveTarget(id, moveTo, forms.length);
    moves = forms.map((form) => ({ row: form, slug: formSlug(form.name, target.name) }));
  }
  const refuse = refusal(FORMS, ['moveTo'], (form) => `Moving "${form.name}" would give it`);
  await refuseCollidingMoves(FORMS, moves, refuse);

  await withAudit(session, async (write) => {
    for (const { row: form, slug } of moves) {
      await write.updateById(ingredientForms, form.id, { groupId: moveTo, slug });
    }
    const [row] = await write.softDeleteByIds(ingredientFormGroups, [id]);
    if (!row) throw new NotFound('No such group');
  }).catch(async (error: unknown) => {
    await refuseCollidingMoves(FORMS, moves, refuse, error);
    throw error;
  });
}

/**
 * Every live form under the group, walked a page at a time through the forms'
 * own reader, so "live" means what the list means by it.
 */
async function formsUnder(groupId: string) {
  const rows: IngredientFormValueRow[] = [];
  let after: Cursor | undefined;
  for (;;) {
    const page = await findIngredientFormValues(
      { groupId },
      { after, limit: MAX_PAGE_SIZE, inverted: false },
    );
    rows.push(...page.map(({ node }) => node));
    if (page.length < MAX_PAGE_SIZE) return rows;
    after = page[page.length - 1].cursor;
  }
}

/** The group's live forms, each beside the slug `groupName` gives it. */
async function formsMoved(groupId: string, groupName: string): Promise<GroupMove[]> {
  const forms = await formsUnder(groupId);
  return forms.map((form) => ({ row: form, slug: formSlug(form.name, groupName) }));
}

/**
 * The live group a delete's `count` forms move to, or the refusal on `moveTo`
 * when none is named, or it names the group itself or no other live group.
 */
async function moveTarget(
  id: string,
  moveTo: string | undefined,
  count: number,
): Promise<IngredientFormGroupRow> {
  const them = `${count} ${count === 1 ? 'form' : 'forms'}`;
  if (moveTo === undefined) {
    throw new ValidationError([
      { path: ['moveTo'], message: `Choose a group to move its ${them} to` },
    ]);
  }
  const target =
    moveTo !== id && RowId.safeParse(moveTo).success
      ? await findOneById(ingredientFormGroups, moveTo)
      : undefined;
  if (!target) {
    throw new ValidationError([
      { path: ['moveTo'], message: `Choose another live group to move its ${them} to` },
    ]);
  }
  return target;
}

/**
 * A write that broke the group slug index, as a `ValidationError` on `name` —
 * the slug is derived and has no field of its own (MB.43) — naming the group
 * holding the address; any other error unchanged.
 */
async function refuseCollision(error: unknown, slug: string): Promise<never> {
  if (violatedUniqueIndex(error) === 'ingredient_form_groups_slug_unique') {
    const holder = await findOneBySlug(ingredientFormGroups, slug);
    throw new ValidationError([
      {
        path: ['name'],
        message: `${holder ? `"${holder.name}"` : 'Another group'} already has the address "${slug}" — choose another name`,
      },
    ]);
  }
  throw error;
}

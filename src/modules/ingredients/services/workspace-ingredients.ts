import 'server-only';
import { findOneByIdInWorkspace, withAudit } from '../../../db/repository';
import { NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { ingredientSlug } from '../../../lib/slugify';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { RowId, parseInput } from '../../../lib/validation';
import { ingredients } from '../schema/ingredients';
import { LocalIngredientInput } from '../validation/ingredient';
import { addFolkNames, columnsOf, replaceFolkNames } from './ingredient-rows';
import { assertMembership } from '@/modules/coven';
import type { IngredientFields, IngredientRow, IngredientValues } from '../types';

// Story 15: a coven's own ingredients. Every read and write is under the
// proof, so the tier is the proof's — `workspace_id` is never read from the
// input, and nothing here can write the compendium or move a row into it
// (claude-docs/db.md, "Workspace ingredients").

/**
 * Creates an ingredient in this coven, with its folk names, in one
 * transaction. The slug is set here from the label, the form and the formal
 * name.
 *
 * @throws {Forbidden} the caller may not write this coven's ingredients.
 * @throws {ValidationError} the input breaks `LocalIngredientInput`, or
 * collides with another of the coven's ingredients.
 */
export async function createWorkspaceIngredient(
  session: Session,
  workspaceId: string,
  input: IngredientValues,
): Promise<IngredientRow> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['create'] });
  const { folkNames, ...fields } = parseInput(LocalIngredientInput, input);

  const slug = ingredientSlug(fields.name, fields.form, fields.canonicalName);

  return withAudit(session, async (write) => {
    const [row] = await write.insertInWorkspace(membership, ingredients, {
      ...columnsOf(fields),
      slug,
    });
    await addFolkNames(write, row.id, folkNames ?? []);
    return row;
  }).catch((error: unknown) => refuseCollision(error, fields, slug));
}

/**
 * Replaces an ingredient of this coven with `input` — the whole ingredient as
 * the form submits it, so a field left out is cleared — and its folk names
 * with `input.folkNames`, in one transaction. A folk name still listed keeps
 * its row; one dropped is soft-deleted. The slug follows the label, the form
 * and the formal name, and nothing redirects from the old one: no route reads
 * a coven ingredient's slug.
 *
 * @throws {Forbidden} the caller may not write this coven's ingredients.
 * @throws {ValidationError} the input breaks `LocalIngredientInput`, or
 * collides with another of the coven's ingredients.
 * @throws {NotFound} no such ingredient in this coven — the compendium's and
 * other covens' included, and an id that is not one.
 */
export async function updateWorkspaceIngredient(
  session: Session,
  workspaceId: string,
  id: string,
  input: IngredientValues,
): Promise<IngredientRow> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['update'] });
  const { folkNames, ...fields } = parseInput(LocalIngredientInput, input);
  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  if (!RowId.safeParse(id).success) throw new NotFound('No such ingredient in this coven');

  const slug = ingredientSlug(fields.name, fields.form, fields.canonicalName);

  return withAudit(session, async (write) => {
    const [row] = await write.updateByIdInWorkspace(membership, ingredients, id, {
      ...columnsOf(fields),
      slug,
    });
    if (!row) throw new NotFound('No such ingredient in this coven');
    await replaceFolkNames(write, [membership], id, folkNames ?? []);
    return row;
  }).catch((error: unknown) => refuseCollision(error, fields, slug));
}

/**
 * Soft-deletes an ingredient of this coven, stamping who deleted it. Its folk
 * names, category links and stock stay; a spell holding it still reaches it
 * (claude-docs/db.md, "Workspace ingredients").
 *
 * @throws {Forbidden} the caller may not delete this coven's ingredients.
 * @throws {NotFound} no live ingredient in this coven has this id — one
 * already deleted, the compendium's and other covens' included, and an id
 * that is not one.
 */
export async function deleteWorkspaceIngredient(
  session: Session,
  workspaceId: string,
  id: string,
): Promise<void> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['delete'] });
  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  if (!RowId.safeParse(id).success) throw new NotFound('No such ingredient in this coven');

  await withAudit(session, async (write) => {
    const [row] = await write.softDeleteByIdInWorkspace(membership, ingredients, id);
    if (!row) throw new NotFound('No such ingredient in this coven');
  });
}

/**
 * One of this coven's ingredients, for any member, viewers included.
 *
 * @throws {Forbidden} the caller may not read this coven's ingredients.
 * @throws {NotFound} no such ingredient in this coven — the compendium's and
 * other covens' included.
 */
export async function getWorkspaceIngredient(
  session: Session,
  workspaceId: string,
  id: string,
): Promise<IngredientRow> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['read'] });

  const row = await findOneByIdInWorkspace(membership, ingredients, id);
  if (!row) throw new NotFound('No such ingredient in this coven');
  return row;
}

/**
 * A write that broke one of the coven's unique indexes, as a `ValidationError`
 * on the field that caused it; any other error unchanged. The label is the
 * identity of an entry with no formal name, so its identity collision is
 * reported on `name`. `slug` is the one this write set.
 */
function refuseCollision(error: unknown, fields: IngredientFields, slug: string): never {
  const refuse = (path: string, message: string) => {
    throw new ValidationError([{ path: [path], message }]);
  };
  const { name, canonicalName, form } = fields;

  switch (violatedUniqueIndex(error)) {
    case 'ingredients_workspace_label_unique':
      refuse('name', `This coven already has an ingredient called "${name}"`);
      break;
    case 'ingredients_workspace_identity_unique':
      if (canonicalName == null) {
        refuse('name', `This coven already has an ingredient called "${name}"`);
      }
      refuse(
        'canonicalName',
        `This coven already has an ingredient that is ${[canonicalName, form].filter(Boolean).join(', ')}`,
      );
      break;
    case 'ingredients_workspace_slug_unique':
      refuse(
        'name',
        `Another ingredient in this coven already has the address "${slug}" — change the name, form or formal name`,
      );
  }
  throw error;
}

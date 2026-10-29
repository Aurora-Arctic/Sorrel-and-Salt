import 'server-only';
import { findOneByIdInWorkspace, withAudit } from '../../../db/repository';
import { NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { RowId, parseInput } from '../../../lib/validation';
import { ingredients } from '../schema/ingredients';
import { ingredientSlug } from '../../../lib/slugify';
import { refuseCupboardLabelAsName } from './cupboard-entries';
import { LocalIngredientInput } from '../validation/ingredient';
import {
  heldDeities,
  ingredientColumns,
  readPromotedFolkName,
  refuseCollision,
  resolvePicks,
  softDeleteIngredient,
  splitChildren,
  swapFolkName,
  writeChildren,
} from './ingredient-rows';
import { assertMembership } from '@/modules/coven';
import type { IngredientRow, IngredientValues } from '../types';

// A coven's own ingredients. Every read and write is under the proof, so the tier is the proof's: `workspace_id` is never read from
// the input, and nothing here can write the compendium (claude-docs/db/workspace-ingredients.md, "Workspace ingredients").

/**
 * Creates an ingredient in this coven with its children in one transaction (claude-docs/db/workspace-ingredients.md,
 * "Workspace ingredient service details").
 *
 * @throws {Forbidden} the caller may not write this coven's ingredients or its stock.
 * @throws {ValidationError} the input breaks `LocalIngredientInput`, or collides, or links outside the compendium and this coven.
 */
export async function createWorkspaceIngredient(
  session: Session,
  workspaceId: string,
  input: IngredientValues,
): Promise<IngredientRow> {
  const membership = await assertMembership(session, workspaceId, {
    ingredient: ['create'],
  });
  const { fields: parsed, lists, picked } = splitChildren(parseInput(LocalIngredientInput, input));
  const picks = await resolvePicks('coven', parsed, picked, []);
  if (picks.issues.length > 0) throw new ValidationError(picks.issues);
  const { fields } = picks;

  const columns = ingredientColumns(fields);
  await refuseCupboardLabelAsName(membership, fields.name);

  return withAudit(session, async (write) => {
    const [row] = await write.insertInWorkspace(membership, ingredients, columns);
    await writeChildren(write, [membership], row.id, { ...lists, ...picks.children }, 'add');
    return row;
  }).catch((error: unknown) => refuseCollision(error, membership, fields, columns.slug, undefined));
}

/**
 * Replaces an ingredient of this coven with `input`, the whole ingredient as the form submits it, and its children with the
 * input's in one transaction (claude-docs/db/workspace-ingredients.md, "Workspace ingredient service details").
 *
 * @throws {Forbidden} the caller may not write this coven's ingredients or its stock.
 * @throws {ValidationError} the input breaks `LocalIngredientInput`, or collides, or links outside the compendium and this coven.
 * @throws {NotFound} no such ingredient in this coven, the compendium's and other covens' included.
 */
export async function updateWorkspaceIngredient(
  session: Session,
  workspaceId: string,
  id: string,
  input: IngredientValues,
): Promise<IngredientRow> {
  const membership = await assertMembership(session, workspaceId, {
    ingredient: ['update'],
  });
  const { fields: parsed, lists, picked } = splitChildren(parseInput(LocalIngredientInput, input));
  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  if (!RowId.safeParse(id).success) throw new NotFound('No such ingredient in this coven');
  const held = await heldDeities([membership], id);
  const picks = await resolvePicks('coven', parsed, picked, held);
  if (picks.issues.length > 0) throw new ValidationError(picks.issues);
  const { fields } = picks;

  const columns = ingredientColumns(fields);
  await refuseCupboardLabelAsName(membership, fields.name);

  return withAudit(session, async (write) => {
    const [row] = await write.updateByIdInWorkspace(membership, ingredients, id, columns);
    if (!row) throw new NotFound('No such ingredient in this coven');
    await writeChildren(
      write,
      [membership],
      id,
      { ...lists, ...picks.children, heldDeities: held },
      'replace',
      membership,
    );
    return row;
  }).catch((error: unknown) => refuseCollision(error, membership, fields, columns.slug, id));
}
/**
 * Swaps the display name of an ingredient of this coven with one of its folk names, in one transaction
 * (claude-docs/db/workspace-ingredients.md, "Workspace ingredient service details").
 *
 * @throws {Forbidden} the caller may not write this coven's ingredients or its stock.
 * @throws {ValidationError} the new display name collides with another of the coven's ingredients.
 * @throws {NotFound} no such ingredient in this coven, or no such live folk name on it.
 */
export async function promoteWorkspaceFolkName(
  session: Session,
  workspaceId: string,
  id: string,
  folkNameId: string,
): Promise<IngredientRow> {
  const membership = await assertMembership(session, workspaceId, {
    ingredient: ['update'],
  });
  if (!RowId.safeParse(id).success) throw new NotFound('No such ingredient in this coven');
  const current = await findOneByIdInWorkspace(membership, ingredients, id);
  if (!current) throw new NotFound('No such ingredient in this coven');
  const { promoted, others } = await readPromotedFolkName([membership], id, folkNameId);

  const fields = { name: promoted.name, canonicalName: current.canonicalName };
  const slug = ingredientSlug(fields.name, fields.canonicalName);
  await refuseCupboardLabelAsName(membership, fields.name);

  return withAudit(session, async (write) => {
    await swapFolkName(write, id, promoted.id, current.name, others);
    const [row] = await write.updateByIdInWorkspace(membership, ingredients, id, {
      name: fields.name,
      slug,
    });
    if (!row) throw new NotFound('No such ingredient in this coven');
    return row;
  }).catch((error: unknown) => refuseCollision(error, membership, fields, slug, id));
}

/**
 * Soft-deletes an ingredient of this coven, stamping who deleted it. Its folk names, category links and stock stay; a spell
 * holding it still reaches it (claude-docs/db/workspace-ingredients.md, "Workspace ingredients").
 *
 * @throws {Forbidden} the caller may not delete this coven's ingredients.
 * @throws {NotFound} no live ingredient in this coven has this id.
 */
export async function deleteWorkspaceIngredient(
  session: Session,
  workspaceId: string,
  id: string,
): Promise<void> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['delete'] });
  await softDeleteIngredient(session, id, 'No such ingredient in this coven', (write) =>
    write.softDeleteByIdInWorkspace(membership, ingredients, id),
  );
}

/**
 * One of this coven's ingredients, for any member, viewers included.
 *
 * @throws {Forbidden} the caller may not read this coven's ingredients.
 * @throws {NotFound} no such ingredient in this coven.
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

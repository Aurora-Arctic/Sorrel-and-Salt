import 'server-only';
import {
  type AuditWriter,
  findManyOfIngredients,
  findOneByIdInWorkspace,
  withAudit,
} from '../../../db/repository';
import { NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { ingredientSlug } from '../../../lib/slugify';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { parseInput } from '../../../lib/validation';
import { ingredientFolkNames } from '../schema/ingredient-folk-names';
import { ingredients } from '../schema/ingredients';
import { LocalIngredientInput } from '../validation/ingredient';
import { type Membership, assertMembership } from '@/modules/coven';

// Story 15: a coven's own ingredients. Every read and write is under the
// proof, so the tier is the proof's — `workspace_id` is never read from the
// input, and nothing here can write the compendium or move a row into it
// (claude-docs/db.md, "Workspace ingredients").

type IngredientRow = typeof ingredients.$inferSelect;

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
  input: LocalIngredientInput,
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
 * its row; one dropped is soft-deleted. The slug is left as it was.
 *
 * @throws {Forbidden} the caller may not write this coven's ingredients.
 * @throws {ValidationError} the input breaks `LocalIngredientInput`, or
 * collides with another of the coven's ingredients.
 * @throws {NotFound} no such ingredient in this coven — the compendium's and
 * other covens' included.
 */
export async function updateWorkspaceIngredient(
  session: Session,
  workspaceId: string,
  id: string,
  input: LocalIngredientInput,
): Promise<IngredientRow> {
  const membership = await assertMembership(session, workspaceId, { ingredient: ['update'] });
  const { folkNames, ...fields } = parseInput(LocalIngredientInput, input);

  return withAudit(session, async (write) => {
    const [row] = await write.updateByIdInWorkspace(membership, ingredients, id, columnsOf(fields));
    if (!row) throw new NotFound('No such ingredient in this coven');
    await replaceFolkNames(write, membership, id, folkNames ?? []);
    return row;
  }).catch((error: unknown) => refuseCollision(error, fields));
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
 * reported on `name`. `slug` is the one this write set — an update sets none.
 */
function refuseCollision(
  error: unknown,
  fields: Omit<LocalIngredientInput, 'folkNames'>,
  slug?: string,
): never {
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

/**
 * The parsed input as columns, every optional one written — `null` where the
 * input has nothing — so an update replaces the row rather than merging into it.
 */
function columnsOf(fields: Omit<LocalIngredientInput, 'folkNames'>) {
  return {
    name: fields.name,
    canonicalName: fields.canonicalName ?? null,
    nomenclature: fields.nomenclature,
    form: fields.form ?? null,
    description: fields.description ?? null,
    element: fields.element ?? null,
    planet: fields.planet ?? null,
    zodiac: fields.zodiac ?? null,
    deities: fields.deities ?? null,
    color: fields.color ?? null,
    safetyNotes: fields.safetyNotes ?? null,
    substitutes: fields.substitutes ?? null,
  };
}

async function addFolkNames(write: AuditWriter, ingredientId: string, names: readonly string[]) {
  for (const name of names) await write.insert(ingredientFolkNames, { ingredientId, name });
}

/**
 * Brings the live folk names to exactly `names`, compared as written: a change
 * of case is a new name. Dropped rows go first, so a name re-added in another
 * case clears the case-folded unique index.
 */
async function replaceFolkNames(
  write: AuditWriter,
  membership: Membership,
  ingredientId: string,
  names: readonly string[],
) {
  const current = await findManyOfIngredients([membership], ingredientFolkNames, [ingredientId]);
  const listed = new Set(names);
  const kept = new Set(current.map((row) => row.name));

  await write.softDeleteByIds(
    ingredientFolkNames,
    current.filter((row) => !listed.has(row.name)).map((row) => row.id),
  );
  await addFolkNames(
    write,
    ingredientId,
    names.filter((name) => !kept.has(name)),
  );
}

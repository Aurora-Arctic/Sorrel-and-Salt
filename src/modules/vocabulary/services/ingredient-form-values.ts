import 'server-only';
import {
  findCompendiumFormRenameClashes,
  findIngredientFormValueCount,
  findIngredientFormValues,
  findOneBySlug,
  withAudit,
} from '../../../db/repository';
import { cachedCompendiumRead, expireCompendium } from '../../../lib/compendium-cache';
import { NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { formSlug } from '../../../lib/slugify';
import { joinAnd, plural } from '../../../lib/text';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { assertCurator } from '@/modules/identity';
import { ingredientFormGroups, ingredientForms } from '../schema/ingredient-forms';
import { IngredientFormValueInput } from '../validation/ingredient-form-value';
import { cachedFilteredList } from './curated-lists';
import { liveRow, parseUnderLiveParent, refuseSlugCollision } from './curated-writes';
import { describeEntry, refuseWhileHeld } from './held-entries';
import type {
  CuratedVocabulary,
  IngredientFormValueFilter,
  IngredientFormValueRow,
} from '../types';

// The curated form vocabulary: public reads, and writes for a curator or an admin alone. A form a live entry's variant picked
// holds, and a rename reaches the variant (claude-docs/db/form-vocabulary-seed.md, "Form value service details").

// The list and its count, held in the data cache under the `compendium` tag (claude-docs/db/compendium-cache.md).
const cachedPage = cachedCompendiumRead('ingredient-form-page', findIngredientFormValues);
const cachedCount = cachedCompendiumRead('ingredient-form-count', findIngredientFormValueCount);
const list = cachedFilteredList(cachedPage, cachedCount, 'groupId');

/** A form's slug is its name and its group's, so a collision is cured by changing either. */
const FORMS: CuratedVocabulary<typeof ingredientForms> = {
  table: ingredientForms,
  slugIndex: 'ingredient_forms_slug_unique',
  noun: 'form',
  addressHint: ' or group',
};

/** One page of the curated form vocabulary under `filter`: a public read, so no session. A blank query is no query. */
export function listIngredientFormValues(
  filter: IngredientFormValueFilter,
  page: PageRequest,
): Promise<PageEntry<IngredientFormValueRow>[]> {
  return list.list(filter, page);
}

/** How many forms `listIngredientFormValues` pages under `filter`, and how many come before `start`: "Page X of Y". */
export function countIngredientFormValues(
  filter: IngredientFormValueFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  return list.count(filter, start);
}

/**
 * The live form at this address — how the admin page opens one to edit.
 *
 * @throws {NotFound} no live form holds the slug.
 */
export async function getIngredientFormValueBySlug(slug: string): Promise<IngredientFormValueRow> {
  const row = await findOneBySlug(ingredientForms, slug);
  if (!row) throw new NotFound('No such form');
  return row;
}

/**
 * Adds a form, its slug derived from the name and the group's name.
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {ValidationError} the input breaks `IngredientFormValueInput`, names no live group, or its slug is a live form's.
 */
export async function createIngredientFormValue(
  session: Session,
  input: IngredientFormValueInput,
): Promise<IngredientFormValueRow> {
  assertCurator(session);
  const { fields, groupName } = await parseForm(input);
  const slug = formSlug(fields.name, groupName);

  const written = await withAudit(session, async (write) => {
    const [row] = await write.insert(ingredientForms, { ...fields, slug });
    return row;
  }).catch((error: unknown) => refuseSlugCollision(FORMS, error, slug));
  expireCompendium();
  return written;
}

/**
 * Rewrites a form whole, its slug following the name and the group, and carries a rename onto every live variant picking it
 * (claude-docs/db/form-vocabulary-seed.md, "Form value service details"). Its `seedKey` is left as it was.
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {ValidationError} as `createIngredientFormValue` throws it, the row's own slug excepted; on `name`, a rename that would give an entry two forms of one name.
 * @throws {NotFound} no live form has this id.
 */
export async function updateIngredientFormValue(
  session: Session,
  id: string,
  input: IngredientFormValueInput,
): Promise<IngredientFormValueRow> {
  const curator = assertCurator(session);
  const { fields, groupName } = await parseForm(input);
  const current = await liveRow(FORMS, id);
  const slug = formSlug(fields.name, groupName);

  const rename = { id, from: current.name, to: fields.name };
  const renamed = rename.from !== rename.to;
  if (renamed) await refuseDoubledForms(rename);

  const written = await withAudit(session, async (write) => {
    const [row] = await write.updateById(ingredientForms, id, { ...fields, slug });
    if (!row) throw new NotFound('No such form');
    if (renamed) await write.carryFormRename(curator, id, fields.name);
    return row;
  }).catch(async (error: unknown) => {
    if (renamed) await refuseDoubledForms(rename, error);
    return refuseSlugCollision(FORMS, error, slug);
  });
  expireCompendium();
  return written;
}

/**
 * Soft-deletes a form no live compendium entry picked (claude-docs/db/form-vocabulary-seed.md, "Form value service details").
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin, or a live entry picked the form.
 * @throws {NotFound} no live form has this id.
 */
export async function deleteIngredientFormValue(session: Session, id: string): Promise<void> {
  assertCurator(session);
  const form = await liveRow(FORMS, id);
  // Read through the compendium's own filter on the pick.
  await refuseWhileHeld(
    { formId: form.id },
    {
      name: form.name,
      holding: 'is the form of',
      remedy: (count) => `Change ${plural(count, 'its', 'their')} form first.`,
    },
  );

  await withAudit(session, async (write) => {
    const [row] = await write.softDeleteByIds(ingredientForms, [id]);
    if (!row) throw new NotFound('No such form');
  });
  expireCompendium();
}

/** The input parsed, its group checked live, and the group's name, which the slug carries. */
async function parseForm(
  input: IngredientFormValueInput,
): Promise<{ fields: IngredientFormValueInput; groupName: string }> {
  const { fields, parent } = await parseUnderLiveParent(IngredientFormValueInput, input, {
    table: ingredientFormGroups,
    column: 'groupId',
    refusal: 'Choose a group',
  });
  return { fields, groupName: parent.name };
}

/** Refuses a rename that would give a live compendium entry two forms of one name, on `name` (claude-docs/db/form-vocabulary-seed.md, "Form value service details"). */
async function refuseDoubledForms(
  rename: { id: string; from: string; to: string },
  error?: unknown,
): Promise<void> {
  if (error !== undefined && violatedUniqueIndex(error) !== 'ingredient_variants_form_unique') {
    return;
  }
  const renaming = `Renaming "${rename.from}" to "${rename.to}"`;
  const doubled = await findCompendiumFormRenameClashes(rename.id, rename.to);
  if (doubled.length > 0) {
    const entries = joinAnd(doubled.map(describeEntry));
    throw new ValidationError([
      {
        path: ['name'],
        message: `${renaming} would give ${entries} two forms called "${rename.to}" — remove one of them first`,
      },
    ]);
  }
  if (error !== undefined) {
    throw new ValidationError([
      {
        path: ['name'],
        message: `${renaming} would give a compendium entry two forms of one name — try again`,
      },
    ]);
  }
}

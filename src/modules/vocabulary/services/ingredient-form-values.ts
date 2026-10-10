import 'server-only';
import {
  type IngredientRow,
  findCompendiumEntryByIdentity,
  findCompendiumEntryBySlug,
  findCompendiumPage,
  findIngredientFormValueCount,
  findIngredientFormValues,
  findOneBySlug,
  withAudit,
} from '../../../db/repository';
import { cachedCompendiumRead, expireCompendium } from '../../../lib/compendium-cache';
import { NotFound, ValidationError } from '../../../lib/errors';
import { allPages } from '../../../lib/pagination';
import type { Session } from '../../../lib/session';
import { formSlug, ingredientSlug } from '../../../lib/slugify';
import { plural } from '../../../lib/text';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { assertSiteAdmin } from '@/modules/identity';
import { ingredientFormGroups, ingredientForms } from '../schema/ingredient-forms';
import { IngredientFormValueInput } from '../validation/ingredient-form-value';
import { cachedFilteredList } from './curated-lists';
import { liveRow, parseUnderLiveParent, refuseSlugCollision } from './curated-writes';
import { describeEntry, redirectRefusal, refuseWhileHeld } from './held-entries';
import type {
  CuratedVocabulary,
  FormRewrite,
  IngredientFormValueFilter,
  IngredientFormValueRow,
} from '../types';

// The curated form vocabulary: its reads, public reference data like every
// curated vocabulary (MB.80), and its writes, the site admin's alone (M5.6a).
// A compendium entry's form is a pick (MB.167), so a form a live entry picked
// holds: its delete is refused, and its rename is carried onto the entry in
// the same write, re-keying it and moving its slug (MB.162). A coven's
// ingredient never holds a form and is never rewritten: what it picked stays,
// and an admin writes nothing of a coven's (M6.6).

// The list and its count, held in the data cache under the `compendium` tag
// (claude-docs/db/compendium-cache.md).
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

/**
 * One page of the curated form vocabulary under `filter`, for
 * `ingredientFormValues` and the admin page's list: a public read (MB.80), so
 * no session, and the finder decides what counts as curated — a live form
 * under a live group. A blank query is no query, and a group id that is not a
 * uuid names no group, so lists nothing, as `listCategories` reads its filter.
 */
export function listIngredientFormValues(
  filter: IngredientFormValueFilter,
  page: PageRequest,
): Promise<PageEntry<IngredientFormValueRow>[]> {
  return list.list(filter, page);
}

/**
 * How many forms `listIngredientFormValues` pages under `filter`, and how
 * many come before `start` — a page's first row, none on an empty page:
 * "Page X of Y".
 */
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
 * @throws {Forbidden} the caller is not a site admin — checked before the
 * input is read.
 * @throws {ValidationError} the input breaks `IngredientFormValueInput`,
 * names no live group, or its slug is a live form's.
 */
export async function createIngredientFormValue(
  session: Session,
  input: IngredientFormValueInput,
): Promise<IngredientFormValueRow> {
  assertSiteAdmin(session);
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
 * Rewrites a form whole, its slug following the name and the group. Its
 * `seedKey` is left as it was, so a renamed seeded row is still the seed's
 * (MB.171).
 *
 * A rename carries the new name onto every live compendium entry picking the
 * form, in the same transaction: each entry's `form` text, so its key, and its
 * slug, the old one retired to redirect for 180 days as any compendium update
 * retires it (MB.82), the compendium's lapsed retirements cleared in the same
 * write. A change of group alone rewrites no entry, since an entry holds the
 * form's name and not its group.
 *
 * The form and its entries are read before the transaction, so an entry
 * picking the form in the instant between keeps the old spelling, as two
 * admins saving one compendium entry at once can retire the older slug.
 *
 * @throws {Forbidden} the caller is not a site admin.
 * @throws {ValidationError} as `createIngredientFormValue` throws it, the
 * row's own slug excepted; on `name`, a rename that would make an entry
 * another live entry's identity or move it onto another's address, naming
 * both; on `endRedirect`, a rename moving an entry onto an address another
 * entry's redirect still runs from, unless the input confirms ending it.
 * @throws {NotFound} no live form has this id.
 */
export async function updateIngredientFormValue(
  session: Session,
  id: string,
  input: IngredientFormValueInput,
): Promise<IngredientFormValueRow> {
  const admin = assertSiteAdmin(session);
  const { fields, groupName, endRedirect } = await parseForm(input);
  const current = await liveRow(FORMS, id);
  const slug = formSlug(fields.name, groupName);

  const rename = { from: current.name, to: fields.name };
  const rewrites = rename.from === rename.to ? [] : await rewritesOf(id, rename.to);
  const at = new Date();
  await refuseCollidingRewrites(rename, rewrites);
  if (endRedirect !== true) {
    const refused = await redirectRefusal(
      rewrites
        .filter(({ entry, slug: moved }) => moved !== entry.slug)
        .map(({ entry, slug: moved }) => ({ slug: moved, entryId: entry.id })),
      at,
    );
    if (refused) throw refused;
  }

  const written = await withAudit(session, async (write) => {
    const [row] = await write.updateById(ingredientForms, id, { ...fields, slug });
    if (!row) throw new NotFound('No such form');
    if (rewrites.length > 0) {
      await write.deleteLapsedSlugRetirements(admin, at);
      await write.carryFormRename(
        admin,
        id,
        fields.name,
        rewrites.map(({ entry, slug: moved }) => ({
          id: entry.id,
          slug: moved,
          previousSlug: entry.slug,
        })),
        at,
      );
    }
    return row;
  }).catch(async (error: unknown) => {
    await refuseCollidingRewrites(rename, rewrites, error);
    return refuseSlugCollision(FORMS, error, slug);
  });
  expireCompendium();
  return written;
}

/**
 * Soft-deletes a form no live compendium entry picked. A coven's ingredient
 * keeps its pick and stops reading it as one — the pick is the coven's, and
 * an admin writes nothing of a coven's (M6.6) — so its text moves into that
 * coven's in-use values.
 *
 * The entries are read before the transaction, so an entry picking the form
 * in the instant between is left holding a deleted one, which reads as no pick.
 *
 * @throws {Forbidden} the caller is not a site admin, or a live compendium
 * entry picked the form — the message names the entries.
 * @throws {NotFound} no live form has this id.
 */
export async function deleteIngredientFormValue(session: Session, id: string): Promise<void> {
  assertSiteAdmin(session);
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

/**
 * The input parsed, its group checked live — a foreign key admits a retired
 * one — and the group's name, which the slug carries. `endRedirect` comes
 * apart from the columns: it is the admin's answer, not the form's.
 */
async function parseForm(input: IngredientFormValueInput): Promise<{
  fields: Omit<IngredientFormValueInput, 'endRedirect'>;
  groupName: string;
  endRedirect: boolean | undefined;
}> {
  const { fields: parsed, parent } = await parseUnderLiveParent(IngredientFormValueInput, input, {
    table: ingredientFormGroups,
    column: 'groupId',
    refusal: 'Choose a group',
  });
  const { endRedirect, ...fields } = parsed;
  return { fields, groupName: parent.name, endRedirect };
}

/**
 * Every live compendium entry picking the form, in the compendium list's
 * order, each beside the slug the new name gives it. Walked a page at a time
 * through the compendium's own filter on the pick, which the
 * `ingredients_compendium_form_id_idx` index answers.
 */
async function rewritesOf(formId: string, name: string): Promise<FormRewrite[]> {
  const entries = await allPages((page) => findCompendiumPage({ formId }, page));
  return entries.map((entry) => ({
    entry,
    slug: ingredientSlug(entry.name, name, entry.canonicalName),
  }));
}

/**
 * Refuses a rename whose rewrite would make an entry another live compendium
 * entry's identity, or move it onto another's address, naming both; the
 * entry itself is excepted, since a change of case keys and slugs it as
 * before. Read before the write, and again after one an index refused, since
 * two admins can race: then `error` is that write's, and anything but a
 * compendium identity or slug collision passes through untouched. A
 * collision the second read cannot place is refused in general terms.
 */
async function refuseCollidingRewrites(
  rename: { from: string; to: string },
  rewrites: readonly FormRewrite[],
  error?: unknown,
): Promise<void> {
  if (error !== undefined) {
    const index = violatedUniqueIndex(error);
    if (
      index !== 'ingredients_compendium_identity_unique' &&
      index !== 'ingredients_compendium_slug_unique'
    ) {
      return;
    }
  }
  const renaming = `Renaming "${rename.from}" to "${rename.to}"`;
  const refuse = (message: string) => {
    throw new ValidationError([{ path: ['name'], message }]);
  };

  const claimed = new Map<string, IngredientRow>();
  for (const { entry, slug } of rewrites) {
    const identity = { name: entry.name, canonicalName: entry.canonicalName, form: rename.to };
    const twin = await findCompendiumEntryByIdentity(identity);
    if (twin && twin.id !== entry.id) {
      refuse(
        `${renaming} would make ${describeEntry(entry)} the same entry as ${describeEntry(twin)} — change one of them first`,
      );
    }
    const holder = claimed.get(slug) ?? (await findCompendiumEntryBySlug(slug));
    if (holder && holder.id !== entry.id) {
      refuse(
        `${renaming} would move ${describeEntry(entry)} to the address "${slug}", which ${describeEntry(holder)} already has — change one of them first`,
      );
    }
    claimed.set(slug, entry);
  }
  if (error !== undefined) {
    refuse(
      `${renaming} would give a compendium entry another entry's identity or address — try again`,
    );
  }
}

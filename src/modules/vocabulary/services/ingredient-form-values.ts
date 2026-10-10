import 'server-only';
import {
  type IngredientRow,
  findCompendiumEntryByIdentity,
  findCompendiumEntryBySlug,
  findCompendiumPage,
  findCompendiumSlugRedirect,
  findIngredientFormValueCount,
  findIngredientFormValues,
  findOneById,
  findOneBySlug,
  withAudit,
} from '../../../db/repository';
import { cachedCompendiumRead } from '../../../lib/compendium-cache';
import { Forbidden, NotFound, ValidationError } from '../../../lib/errors';
import { MAX_PAGE_SIZE } from '../../../lib/pagination';
import type { Session } from '../../../lib/session';
import { formSlug, ingredientSlug } from '../../../lib/slugify';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { inUtc } from '../../../lib/utc';
import { RowId, parseInput } from '../../../lib/validation';
import { assertSiteAdmin } from '@/modules/identity';
import { ingredientFormGroups, ingredientForms } from '../schema/ingredient-forms';
import { IngredientFormValueInput } from '../validation/ingredient-form-value';
import { describeEntry, heldBy } from './held-entries';
import type { FormRewrite, IngredientFormValueFilter, IngredientFormValueRow } from '../types';

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

/**
 * One page of the curated form vocabulary under `filter`, for
 * `ingredientFormValues` and the admin page's list: a public read (MB.80), so
 * no session, and the finder decides what counts as curated — a live form
 * under a live group. A blank query is no query, and a group id that is not a
 * uuid names no group, so lists nothing, as `listCategories` reads its filter.
 */
export async function listIngredientFormValues(
  filter: IngredientFormValueFilter,
  page: PageRequest,
): Promise<PageEntry<IngredientFormValueRow>[]> {
  const read = readable(filter);
  return read ? cachedPage(read, page) : [];
}

/**
 * How many forms `listIngredientFormValues` pages under `filter`, and how
 * many come before `start` — a page's first row, none on an empty page:
 * "Page X of Y".
 */
export async function countIngredientFormValues(
  filter: IngredientFormValueFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  const read = readable(filter);
  return read ? cachedCount(read, start) : { totalCount: 0, countBefore: null };
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

  return withAudit(session, async (write) => {
    const [row] = await write.insert(ingredientForms, { ...fields, slug });
    return row;
  }).catch((error: unknown) => refuseFormCollision(error, slug));
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
  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  if (!RowId.safeParse(id).success) throw new NotFound('No such form');
  const current = await findOneById(ingredientForms, id);
  if (!current) throw new NotFound('No such form');
  const slug = formSlug(fields.name, groupName);

  const rename = { from: current.name, to: fields.name };
  const rewrites = rename.from === rename.to ? [] : await rewritesOf(id, rename.to);
  const at = new Date();
  await refuseCollidingRewrites(rename, rewrites);
  if (endRedirect !== true) await refuseEndingRedirects(rewrites, at);

  return withAudit(session, async (write) => {
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
    return refuseFormCollision(error, slug);
  });
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
  if (!RowId.safeParse(id).success) throw new NotFound('No such form');
  const form = await findOneById(ingredientForms, id);
  if (!form) throw new NotFound('No such form');
  await refuseWhilePicked(form);

  await withAudit(session, async (write) => {
    const [row] = await write.softDeleteByIds(ingredientForms, [id]);
    if (!row) throw new NotFound('No such form');
  });
}

/**
 * The filter as the repository reads it, its query trimmed and a blank one
 * dropped; `undefined` for a group id that is not a uuid, which names nothing
 * and would be a driver error at the comparison.
 */
function readable({
  query,
  groupId,
}: IngredientFormValueFilter): IngredientFormValueFilter | undefined {
  if (groupId !== undefined && !RowId.safeParse(groupId).success) return undefined;
  return { query: query?.trim() || undefined, groupId };
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
  const { endRedirect, ...fields } = parseInput(IngredientFormValueInput, input);
  const group = await findOneById(ingredientFormGroups, fields.groupId);
  if (!group) throw new ValidationError([{ path: ['groupId'], message: 'Choose a group' }]);
  return { fields, groupName: group.name, endRedirect };
}

/**
 * The refusal of a delete while live compendium entries picked the form: the
 * first few by name, each told apart from a namesake, and how many more, read
 * through the compendium's own filter on the pick.
 */
async function refuseWhilePicked(form: IngredientFormValueRow): Promise<void> {
  const held = await heldBy({ formId: form.id });
  if (!held) return;
  const { totalCount, list } = held;
  const entries = totalCount === 1 ? 'entry' : 'entries';
  const their = totalCount === 1 ? 'its' : 'their';
  throw new Forbidden(
    `"${form.name}" is the form of ${totalCount} compendium ${entries} — ${list}. Change ${their} form first.`,
  );
}

/**
 * Every live compendium entry picking the form, in the compendium list's
 * order, each beside the slug the new name gives it. Walked a page at a time
 * through the compendium's own filter on the pick, which the
 * `ingredients_compendium_form_id_idx` index answers.
 */
async function rewritesOf(formId: string, name: string): Promise<FormRewrite[]> {
  const entries: IngredientRow[] = [];
  let after: Cursor | undefined;
  for (;;) {
    const page = await findCompendiumPage(
      { formId },
      { after, limit: MAX_PAGE_SIZE, inverted: false },
    );
    entries.push(...page.map(({ node }) => node));
    if (page.length < MAX_PAGE_SIZE) break;
    after = page[page.length - 1].cursor;
  }
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

/**
 * Refuses a rename moving an entry onto a slug another entry's redirect still
 * runs from, until the admin confirms ending it (MB.82), naming each entry
 * whose redirect would end and the instant its window closes. On
 * `endRedirect`, so the form can ask and send the write again. Read before the
 * write rather than inside it: two admins saving at once can both pass it.
 */
async function refuseEndingRedirects(rewrites: readonly FormRewrite[], at: Date): Promise<void> {
  const ended: string[] = [];
  for (const { entry, slug } of rewrites) {
    if (slug === entry.slug) continue;
    const redirect = await findCompendiumSlugRedirect(slug, at, entry.id);
    if (redirect) {
      ended.push(
        `"${slug}" redirects to ${describeEntry(redirect.entry)} until ${inUtc(redirect.expiresAt)}`,
      );
    }
  }
  if (ended.length === 0) return;
  const list =
    ended.length === 1
      ? ended[0]
      : `${ended.slice(0, -1).join(', ')} and ${ended[ended.length - 1]}`;
  const those = ended.length === 1 ? 'that redirect' : 'those redirects';
  throw new ValidationError([
    { path: ['endRedirect'], message: `${list} — confirm to end ${those}` },
  ]);
}

/**
 * A write that broke the form slug index, as a `ValidationError` on `name` —
 * the slug is derived and has no field of its own (MB.43) — naming the form
 * holding the address; any other error unchanged.
 */
async function refuseFormCollision(error: unknown, slug: string): Promise<never> {
  if (violatedUniqueIndex(error) === 'ingredient_forms_slug_unique') {
    const holder = await findOneBySlug(ingredientForms, slug);
    throw new ValidationError([
      {
        path: ['name'],
        message: `${holder ? `"${holder.name}"` : 'Another form'} already has the address "${slug}" — choose another name or group`,
      },
    ]);
  }
  throw error;
}

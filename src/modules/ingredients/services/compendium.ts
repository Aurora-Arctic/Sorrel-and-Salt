import 'server-only';
import {
  type CompendiumScore,
  findCompendiumCount,
  findCompendiumEntryByIdentity,
  findCompendiumEntryBySlug,
  findCompendiumPage,
  findCompendiumSlugRedirect,
  findOneIngredient,
  withAudit,
} from '../../../db/repository';
import { Forbidden, NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { ingredientSlug } from '../../../lib/slugify';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { RowId, parseInput } from '../../../lib/validation';
import { ingredients } from '../schema/ingredients';
import { retiredIngredientSlugs } from '../schema/retired-ingredient-slugs';
import { CompendiumFilter, type CompendiumFilterInput } from '../validation/compendium-filter';
import { CompendiumIngredientInput } from '../validation/ingredient';
import {
  addFolkNames,
  addReferenceLinks,
  addSubstitutes,
  columnsOf,
  replaceFolkNames,
  replaceReferenceLinks,
  replaceSubstitutes,
} from './ingredient-rows';
import { type Membership, assertMembership } from '@/modules/coven';
import { assertSiteAdmin } from '@/modules/identity';
import { type CuratedField, curatedSpellings, foldVocabularyValue } from '@/modules/vocabulary';
import type {
  Cursor,
  PageCount,
  PageEntry,
  PageRequest,
  ValidationIssue,
} from '../../../lib/types';
import type { CompendiumAddress, CompendiumWrite, IngredientFields, IngredientRow } from '../types';

// The compendium: the public surface (MB.80), so the list takes no session at
// all and an entry answers anyone (claude-docs/db/compendium-read.md, "The compendium read");
// its writes, which are the site admin's alone and reach no coven's rows
// (claude-docs/db/compendium-writes.md, "Compendium writes"); and its addresses, which follow an
// entry's name and redirect from the old one for a window
// (claude-docs/db/ingredient-slugs.md, "Ingredient slugs").

/**
 * One page of the compendium under `filter`, best match first on a search,
 * each entry carrying its score. Parsed here because the browser is not the
 * only caller, and because a category id reaches a `uuid` comparison inside
 * the keyset query, whose one client text was the cursor: unchecked, a
 * malformed id would come back as "Invalid cursor". A query shorter than
 * `MIN_QUERY_LENGTH` is no search.
 *
 * @throws {ValidationError} a category id is not a uuid.
 */
export async function listCompendium(
  filter: CompendiumFilterInput,
  page: PageRequest,
): Promise<PageEntry<IngredientRow, CompendiumScore>[]> {
  return findCompendiumPage(parseInput(CompendiumFilter, filter), page);
}

/**
 * How many entries the compendium holds under `filter`, and how many come
 * before `start` — a page's first row, none on an empty page. Parsed as
 * `listCompendium` parses, so it counts the rows that list's pages hold.
 *
 * @throws {ValidationError} a category id is not a uuid.
 */
export async function countCompendium(
  filter: CompendiumFilterInput,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findCompendiumCount(parseInput(CompendiumFilter, filter), start);
}

/**
 * One ingredient by id: a compendium entry for anyone, signed out included,
 * and — with `workspaceId` — that coven's own entry for its members, viewers
 * included. Without a coven the read is the compendium alone, so a coven's
 * row answers `NotFound` to whoever asks: its existence is private.
 *
 * @throws {Forbidden} a coven is named and the caller is not in it, a site
 * admin and a signed-out caller included.
 * @throws {NotFound} no such entry where the caller may look.
 */
export async function getIngredient(
  session: Session | null,
  id: string,
  workspaceId?: string | null,
): Promise<IngredientRow> {
  const memberships: Membership[] = [];
  if (workspaceId != null) {
    if (!session) throw new Forbidden();
    memberships.push(await assertMembership(session, workspaceId, { ingredient: ['read'] }));
  }

  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  const row = RowId.safeParse(id).success ? await findOneIngredient(memberships, id) : undefined;
  if (!row) throw new NotFound('No such ingredient');
  return row;
}

/**
 * Creates a compendium entry, with its folk names, substitutes and references,
 * in one transaction. Its form, planets, signs and deities are written in their
 * curated rows' spelling. The slug is set here from the label, the form and
 * the formal name, and the compendium's lapsed retirements are cleared in the
 * same write.
 *
 * @throws {Forbidden} the caller is not a site admin — checked before the
 * input is read.
 * @throws {ValidationError} the input breaks `CompendiumIngredientInput` — a
 * missing `nomenclature` included — names a form, planet, sign or deity no
 * live curated row holds, collides with another entry, would end another
 * entry's redirect without `endRedirect`, or links a substitute or cites a
 * reference outside the compendium.
 */
export async function createCompendiumEntry(
  session: Session,
  input: CompendiumWrite,
): Promise<IngredientRow> {
  const admin = assertSiteAdmin(session);
  const { folkNames, substitutes, references, ...parsed } = parseInput(
    CompendiumIngredientInput,
    input,
  );
  const fields = await inCuratedSpellings(input, parsed);

  const slug = ingredientSlug(fields.name, fields.form, fields.canonicalName);
  const at = new Date();
  await refuseEndingARedirect(slug, at, input.endRedirect);

  return withAudit(session, async (write) => {
    await write.deleteLapsedSlugRetirements(admin, at);
    const [row] = await write.insertInCompendium(admin, ingredients, {
      ...columnsOf(fields),
      slug,
    });
    await addFolkNames(write, row.id, folkNames ?? []);
    await addSubstitutes(write, [], row.id, substitutes ?? []);
    await addReferenceLinks(write, [], row.id, references ?? []);
    return row;
  }).catch((error: unknown) => refuseCollision(error, fields, slug));
}

/**
 * Replaces a compendium entry with `input` — the whole entry as the form
 * submits it, so a field left out is cleared — and its folk names,
 * substitutes and references with the input's, in one transaction. The slug follows the
 * label, the form and the formal name; when it moves, the old one is retired
 * as this admin's, and redirects to the entry for 180 days. The curated
 * fields are spelled as `createCompendiumEntry` spells them.
 *
 * The row is read before the transaction, for the slug it holds; two admins
 * saving one entry at the same instant can retire the older slug rather
 * than the one the other just wrote.
 *
 * @throws {Forbidden} the caller is not a site admin.
 * @throws {ValidationError} the input breaks `CompendiumIngredientInput`,
 * names a form, planet, sign or deity no live curated row holds, collides
 * with another entry, would end another entry's redirect without
 * `endRedirect`, or adds a substitute link or a reference outside the
 * compendium.
 * @throws {NotFound} no live compendium entry has this id — a coven's
 * ingredient included, and an id that is not one.
 */
export async function updateCompendiumEntry(
  session: Session,
  id: string,
  input: CompendiumWrite,
): Promise<IngredientRow> {
  const admin = assertSiteAdmin(session);
  const { folkNames, substitutes, references, ...parsed } = parseInput(
    CompendiumIngredientInput,
    input,
  );
  const fields = await inCuratedSpellings(input, parsed);
  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  if (!RowId.safeParse(id).success) throw new NotFound('No such compendium entry');
  const current = await findOneIngredient([], id);
  if (!current) throw new NotFound('No such compendium entry');

  const slug = ingredientSlug(fields.name, fields.form, fields.canonicalName);
  const at = new Date();
  const moves = slug !== current.slug;
  if (moves) await refuseEndingARedirect(slug, at, input.endRedirect, id);

  return withAudit(session, async (write) => {
    await write.deleteLapsedSlugRetirements(admin, at);
    const [row] = await write.updateByIdInCompendium(admin, ingredients, id, {
      ...columnsOf(fields),
      slug,
    });
    if (!row) throw new NotFound('No such compendium entry');
    if (moves) {
      await write.insertInCompendium(admin, retiredIngredientSlugs, {
        ingredientId: id,
        slug: current.slug,
        retiredAt: at,
      });
    }
    await replaceFolkNames(write, [], id, folkNames ?? []);
    await replaceSubstitutes(write, [], id, substitutes ?? []);
    await replaceReferenceLinks(write, [], id, references ?? []);
    return row;
  }).catch((error: unknown) => refuseCollision(error, fields, slug));
}

/**
 * The public route's one read of an address, taking no session: the live
 * entry holding `slug`, naming an entry that moved off it while that entry's
 * window is open; else the current slug of the entry whose redirect from
 * `slug` is still running, for a 308.
 *
 * @throws {NotFound} nothing is at `slug` and nothing redirects from it — a
 * coven's slug included, since a coven entry's existence is private.
 */
export async function resolveCompendiumSlug(slug: string): Promise<CompendiumAddress> {
  const at = new Date();
  const entry = await findCompendiumEntryBySlug(slug);
  if (entry) {
    const previous = await findCompendiumSlugRedirect(slug, at, entry.id);
    return { kind: 'entry', entry, movedAway: previous?.entry ?? null };
  }
  const redirect = await findCompendiumSlugRedirect(slug, at);
  if (redirect) return { kind: 'moved', slug: redirect.entry.slug };
  throw new NotFound('No such compendium entry');
}

/** What each curated field is called in a refusal. */
const NOUN_OF: Record<CuratedField, string> = {
  form: 'form',
  planets: 'planet',
  zodiacSigns: 'zodiac sign',
  deities: 'deity',
};

const LIST_FIELDS = ['planets', 'zodiacSigns', 'deities'] as const satisfies CuratedField[];

/**
 * `fields` with its form, planets, signs and deities each in the spelling of
 * the live curated row it folds to: a compendium entry holds curated values
 * alone, where a coven's ingredient keeps what was typed (MB.162; DESIGN.md
 * §5). A list's refusal is placed at the entry `input` sent, blanks counted,
 * since parsing drops blank entries and the form numbers its rows by what it
 * sent. Read before the write rather than inside it, so an admin retiring a
 * row while another saves an entry naming it can leave that entry holding it.
 *
 * @throws {ValidationError} beside each value no live curated row holds —
 * every one at once, so the admin sees the whole list to add.
 */
async function inCuratedSpellings(
  input: CompendiumWrite,
  fields: IngredientFields,
): Promise<IngredientFields> {
  const [forms, planets, zodiacSigns, deities] = await Promise.all([
    curatedSpellings('form', fields.form == null ? [] : [fields.form]),
    ...LIST_FIELDS.map((field) => curatedSpellings(field, fields[field] ?? [])),
  ]);
  const spellingsOf = { form: forms, planets, zodiacSigns, deities };
  const spellingOf = (field: CuratedField, value: string) =>
    spellingsOf[field].get(foldVocabularyValue(value));

  const issues: ValidationIssue[] = [];
  const check = (field: CuratedField, value: string, path: ValidationIssue['path']) => {
    if (value.trim() === '' || spellingOf(field, value) !== undefined) return;
    issues.push({
      path,
      message: `No curated ${NOUN_OF[field]} is called "${value.trim()}" — add it to the ${NOUN_OF[field]} list first`,
    });
  };
  if (fields.form != null) check('form', fields.form, ['form']);
  for (const field of LIST_FIELDS) {
    (input[field] ?? []).forEach((value, index) => check(field, value, [field, index]));
  }
  if (issues.length > 0) throw new ValidationError(issues);

  const spell = (field: (typeof LIST_FIELDS)[number]) =>
    fields[field]?.map((value) => spellingOf(field, value) ?? value);
  return {
    ...fields,
    form: fields.form == null ? fields.form : spellingOf('form', fields.form),
    planets: spell('planets'),
    zodiacSigns: spell('zodiacSigns'),
    deities: spell('deities'),
  };
}

/**
 * Refuses a write whose slug another entry's redirect runs from, unless the
 * admin has confirmed ending it. On `endRedirect`, so the form can ask and
 * send the write again; the retirement stays, so the page at the address can
 * link to the entry that moved. Read before the write rather than inside it:
 * two admins saving at once can both pass it.
 */
async function refuseEndingARedirect(
  slug: string,
  at: Date,
  confirmed: boolean | undefined,
  excluding?: string,
): Promise<void> {
  if (confirmed === true) return;
  const redirect = await findCompendiumSlugRedirect(slug, at, excluding);
  if (!redirect) return;
  throw new ValidationError([
    {
      path: ['endRedirect'],
      message: `"${slug}" redirects to ${describeEntry(redirect.entry)} until ${inUtc(redirect.expiresAt)} — confirm to end that redirect`,
    },
  ]);
}

/** An instant as a person reads it, in UTC: `28 August 2026, 00:00 UTC`. */
function inUtc(at: Date): string {
  const day = at.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const time = at.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  });
  return `${day}, ${time} UTC`;
}

/**
 * Soft-deletes a compendium entry, stamping who deleted it. Its folk names
 * and category links stay, and a spell holding it still reaches it
 * (claude-docs/db/spell-visibility.md, "What a spell holds").
 *
 * @throws {Forbidden} the caller is not a site admin.
 * @throws {NotFound} no live compendium entry has this id — one already
 * deleted, a coven's ingredient, and an id that is not one included.
 */
export async function deleteCompendiumEntry(session: Session, id: string): Promise<void> {
  const admin = assertSiteAdmin(session);
  if (!RowId.safeParse(id).success) throw new NotFound('No such compendium entry');

  await withAudit(session, async (write) => {
    const [row] = await write.softDeleteByIdInCompendium(admin, ingredients, id);
    if (!row) throw new NotFound('No such compendium entry');
  });
}

/**
 * A write that broke one of the compendium's unique indexes, as a
 * `ValidationError` on the field that caused it; any other error unchanged.
 * An identity collision names the entry holding the identity, read after the
 * write rolled back: a label with no formal name keys as another entry's
 * formal name (DESIGN.md §5), so the input alone would not say which entry
 * that is. That collision is reported on `name`, the field the admin filled
 * in. A slug collision names the entry holding the address, as the slug the
 * two fold to is not always one the admin can see in either input.
 */
async function refuseCollision(
  error: unknown,
  fields: IngredientFields,
  slug: string,
): Promise<never> {
  const refuse = (path: string, message: string) => {
    throw new ValidationError([{ path: [path], message }]);
  };

  switch (violatedUniqueIndex(error)) {
    case 'ingredients_compendium_identity_unique': {
      const holder = await findCompendiumEntryByIdentity(fields);
      refuse(
        fields.canonicalName == null ? 'name' : 'canonicalName',
        holder
          ? `Already in the compendium as ${describeEntry(holder)}`
          : 'Already in the compendium',
      );
      break;
    }
    case 'ingredients_compendium_slug_unique': {
      const holder = await findCompendiumEntryBySlug(slug);
      refuse(
        'name',
        `${holder ? describeEntry(holder) : 'Another compendium entry'} already has the address "${slug}" — change the name, form or formal name`,
      );
    }
  }
  throw error;
}

/** An entry as a person tells it apart: its label, then its formal name and form. */
function describeEntry(entry: IngredientRow): string {
  const identity = [entry.canonicalName, entry.form].filter(Boolean).join(', ');
  return identity ? `"${entry.name}" (${identity})` : `"${entry.name}"`;
}

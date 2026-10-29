import 'server-only';
import {
  type CompendiumScore,
  findCompendiumCount,
  findCompendiumEntryByIdentity,
  findCompendiumEntryBySlug,
  findCompendiumPage,
  findCompendiumReview,
  findCompendiumSlugRedirect,
  countCovensUsing,
  findOneIngredient,
  withAudit,
} from '../../../db/repository';
import { cachedCompendiumRead, expireCompendium } from '../../../lib/compendium-cache';
import { NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { ingredientSlug } from '../../../lib/slugify';
import { addressTaken } from '../../../lib/text';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { RowId, parseInput } from '../../../lib/validation';
import { compendiumFilterFor } from './compendium-filter';
import { heldCompendiumEntry } from './cupboard-entries';
import { ingredientDetailOf } from './ingredient-detail';
import { ingredients } from '../schema/ingredients';
import { retiredIngredientSlugs } from '../schema/retired-ingredient-slugs';
import type { CompendiumFilterInput } from '../validation/compendium-filter';
import { CompendiumIngredientInput } from '../validation/ingredient';
import {
  heldDeities,
  ingredientColumns,
  readPromotedFolkName,
  resolvePicks,
  softDeleteIngredient,
  splitChildren,
  swapFolkName,
  writeChildren,
} from './ingredient-rows';
import { readersOf } from '@/modules/coven';
import { assertCurator } from '@/modules/identity';
import {
  type CuratedField,
  curatedSpellings,
  describeEntry,
  foldVocabularyValue,
  redirectRefusal,
} from '@/modules/vocabulary';
import type {
  Cursor,
  PageCount,
  PageEntry,
  PageRequest,
  ValidationIssue,
} from '../../../lib/types';
import type {
  CompendiumAddress,
  CompendiumReview,
  CompendiumEntryPage,
  CompendiumWrite,
  DeityRecord,
  IngredientFields,
  IngredientRow,
  PickedLists,
} from '../types';

// The compendium: the public surface (MB.80), so the list takes no session at
// all and an entry answers anyone (claude-docs/db/compendium-read.md, "The compendium read");
// its writes, which are a curator's or an admin's alone and reach no coven's rows
// (claude-docs/db/compendium-writes.md, "Compendium writes"); and its addresses, which follow an
// entry's name and redirect from the old one for a window
// (claude-docs/db/ingredient-slugs.md, "Ingredient slugs").

// The list and its count, held in the data cache under the `compendium` tag
// and keyed by the parsed filter (claude-docs/db/compendium-cache.md).
const cachedPage = cachedCompendiumRead('compendium-page', findCompendiumPage);
const cachedCount = cachedCompendiumRead('compendium-count', findCompendiumCount);

/**
 * One page of the compendium under `filter`, best match first on a search,
 * each entry carrying its score. Parsed here because the browser is not the
 * only caller, and because a category or deity id reaches a `uuid` comparison inside
 * the keyset query, whose one client text was the cursor: unchecked, a
 * malformed id would come back as "Invalid cursor". A query shorter than
 * `MIN_QUERY_LENGTH` is no search.
 *
 * `viewer` is needed only for the Reviewed setting (M14.8), which a curator
 * alone may set; the rest of the list takes no session.
 *
 * @throws {Forbidden} the filter sets Reviewed and `viewer` is not a curator.
 * @throws {ValidationError} a category or deity id is not a uuid, or the
 * toxic setting is not one of `TOXIC_FILTERS`.
 */
export async function listCompendium(
  filter: CompendiumFilterInput,
  page: PageRequest,
  viewer: Session | null = null,
): Promise<PageEntry<IngredientRow, CompendiumScore>[]> {
  return cachedPage(compendiumFilterFor(filter, viewer), page);
}

/**
 * How many entries the compendium holds under `filter`, and how many come
 * before `start` — a page's first row, none on an empty page. Parsed as
 * `listCompendium` parses, so it counts the rows that list's pages hold, and
 * refused the Reviewed setting as it refuses it.
 *
 * @throws {Forbidden} the filter sets Reviewed and `viewer` is not a curator.
 * @throws {ValidationError} a category or deity id is not a uuid, or the
 * toxic setting is not one of `TOXIC_FILTERS`.
 */
export async function countCompendium(
  filter: CompendiumFilterInput,
  start: Cursor | undefined,
  viewer: Session | null = null,
): Promise<PageCount> {
  return cachedCount(compendiumFilterFor(filter, viewer), start);
}

/**
 * One ingredient by id: a compendium entry for anyone, signed out included,
 * and — with `workspaceId` — that coven's own entry for its members, viewers
 * included. Without a coven the read is the compendium alone, so a coven's
 * row answers `NotFound` to whoever asks: its existence is private. A
 * compendium entry the curators have retired answers only a coven whose
 * cupboard names it (M12.24), and `NotFound` to everyone else.
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
  const memberships = await readersOf(session, workspaceId, { ingredient: ['read'] });

  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  const row = RowId.safeParse(id).success ? await findOneIngredient(memberships, id) : undefined;
  if (row) return row;
  const [membership] = memberships;
  const held = membership && (await heldCompendiumEntry(membership, id));
  if (!held) throw new NotFound('No such ingredient');
  return held.entry;
}

/**
 * Creates a compendium entry, with its folk names, substitutes, deities,
 * references, categories and forms, in one transaction. Its forms and deities are picked from their
 * curated vocabularies and its celestial bodies and signs, and its forms', named from theirs, each
 * written in its curated row's spelling. The slug is set here from the label
 * and the formal name, and the compendium's lapsed retirements are
 * cleared in the same write.
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin — checked before the
 * input is read.
 * @throws {ValidationError} the input breaks `CompendiumIngredientInput` — a
 * missing `nomenclature` included — carries a form or deity not picked from a
 * curated row, a celestial body or sign no curated row holds, collides with another
 * entry, would end another entry's redirect without `endRedirect`, files it
 * under no live category, or links a substitute or cites a reference outside
 * the compendium.
 */
export async function createCompendiumEntry(
  session: Session,
  input: CompendiumWrite,
): Promise<IngredientRow> {
  const curator = assertCurator(session);
  const {
    fields: parsed,
    lists,
    picked,
  } = splitChildren(parseInput(CompendiumIngredientInput, input));
  const curated = await inCuratedValues(input, parsed, picked, []);
  const { fields } = curated;

  const columns = ingredientColumns(fields);
  const { slug } = columns;
  const at = new Date();
  await refuseEndingARedirect(slug, at, input.endRedirect);

  const written = await withAudit(session, async (write) => {
    await write.deleteLapsedSlugRetirements(curator, at);
    const [row] = await write.insertInCompendium(curator, ingredients, columns);
    await writeChildren(write, [], row.id, { ...lists, ...curated.children }, 'add');
    return row;
  }).catch((error: unknown) => refuseCollision(error, fields, slug, undefined));
  expireCompendium();
  return written;
}

/**
 * Replaces a compendium entry with `input` — the whole entry as the form
 * submits it, so a field left out is cleared — and its folk names,
 * substitutes, deities, references, categories and forms with the input's, in
 * one transaction, a form kept by its id or else its text folded (MB.219).
 * The slug follows the label and the formal name; when it moves, the
 * old one is retired as this admin's, and redirects to the entry for 180 days.
 * The curated fields are held as `createCompendiumEntry` holds them.
 *
 * The row is read before the transaction, for the slug it holds; two admins
 * saving one entry at the same instant can retire the older slug rather
 * than the one the other just wrote.
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {ValidationError} the input breaks `CompendiumIngredientInput`,
 * carries a form or deity not picked from a curated row, a celestial body or sign no
 * curated row holds, collides with another entry, would end another entry's
 * redirect without `endRedirect`, files it under no live category, or adds
 * a substitute link or a reference outside the compendium.
 * @throws {NotFound} no live compendium entry has this id — a coven's
 * ingredient included, and an id that is not one.
 */
export async function updateCompendiumEntry(
  session: Session,
  id: string,
  input: CompendiumWrite,
): Promise<IngredientRow> {
  const curator = assertCurator(session);
  const {
    fields: parsed,
    lists,
    picked,
  } = splitChildren(parseInput(CompendiumIngredientInput, input));
  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  if (!RowId.safeParse(id).success) throw new NotFound('No such compendium entry');
  const held = await heldDeities([], id);
  const curated = await inCuratedValues(input, parsed, picked, held);
  const { fields } = curated;
  const current = await findOneIngredient([], id);
  if (!current) throw new NotFound('No such compendium entry');

  const columns = ingredientColumns(fields);
  const { slug } = columns;
  const at = new Date();
  const moves = slug !== current.slug;
  if (moves) await refuseEndingARedirect(slug, at, input.endRedirect, id);

  const written = await withAudit(session, async (write) => {
    await write.deleteLapsedSlugRetirements(curator, at);
    const [row] = await write.updateByIdInCompendium(curator, ingredients, id, columns);
    if (!row) throw new NotFound('No such compendium entry');
    if (moves) {
      await write.insertInCompendium(curator, retiredIngredientSlugs, {
        ingredientId: id,
        slug: current.slug,
        retiredAt: at,
      });
    }
    await writeChildren(
      write,
      [],
      id,
      { ...lists, ...curated.children, heldDeities: held },
      'replace',
      curator,
    );
    return row;
  }).catch((error: unknown) => refuseCollision(error, fields, slug, id));
  expireCompendium();
  return written;
}

/**
 * Swaps the display name of a compendium entry with one of its folk names, in
 * one transaction, as `promoteWorkspaceFolkName` does for a coven's: the folk
 * name becomes the display name and the old one a folk name, kept once
 * whatever its case. The change is global — every coven sees the entry's new
 * name. The slug follows the label, so when it moves the old one is retired and
 * redirects for 180 days, as in `updateCompendiumEntry`; a slug another
 * entry's redirect still runs from refuses the promotion, since this write
 * has no way to confirm ending it.
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {ValidationError} the new display name collides with another entry,
 * or its address is one another entry's redirect runs from.
 * @throws {NotFound} no live compendium entry has this id — a coven's
 * ingredient included — or it holds no such live folk name.
 */
export async function promoteCompendiumFolkName(
  session: Session,
  id: string,
  folkNameId: string,
): Promise<IngredientRow> {
  const curator = assertCurator(session);
  if (!RowId.safeParse(id).success) throw new NotFound('No such compendium entry');
  const current = await findOneIngredient([], id);
  if (!current) throw new NotFound('No such compendium entry');
  const { promoted, others } = await readPromotedFolkName([], id, folkNameId);

  const fields = { name: promoted.name, canonicalName: current.canonicalName };
  const slug = ingredientSlug(fields.name, fields.canonicalName);
  const at = new Date();
  const moves = slug !== current.slug;
  if (moves) await refuseEndingARedirect(slug, at, undefined, id);

  const written = await withAudit(session, async (write) => {
    await write.deleteLapsedSlugRetirements(curator, at);
    await swapFolkName(write, id, promoted.id, current.name, others);
    const [row] = await write.updateByIdInCompendium(curator, ingredients, id, {
      name: fields.name,
      slug,
    });
    if (!row) throw new NotFound('No such compendium entry');
    if (moves) {
      await write.insertInCompendium(curator, retiredIngredientSlugs, {
        ingredientId: id,
        slug: current.slug,
        retiredAt: at,
      });
    }
    return row;
  }).catch((error: unknown) => refuseCollision(error, fields, slug, id));
  expireCompendium();
  return written;
}

/**
 * Marks a compendium entry reviewed by this curator, or clears the mark, so it
 * needs review again (M14.8). This is the only function that writes the mark
 * (the owner, 2026-10-23): creating, editing or promoting leaves it as it was.
 * Marking an entry already reviewed keeps its original date and reviewer. The
 * seed never overwrites a reviewed entry
 * (claude-docs/db/compendium-seed/README.md). The mark is the only change: the
 * `set_updated_at` trigger leaves `updated_at` and `updated_by` as they were
 * (M14.5), so the entry is not shown as Updated.
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {NotFound} no live compendium entry has this id — a coven's
 * ingredient, one deleted and an id that is not one included.
 */
export async function setCompendiumEntryReviewed(
  session: Session,
  id: string,
  reviewed: boolean,
): Promise<IngredientRow> {
  const curator = assertCurator(session);
  if (!RowId.safeParse(id).success) throw new NotFound('No such compendium entry');
  const written = await withAudit(session, async (write) => {
    const [row] = await write.setReviewInCompendium(curator, id, reviewed);
    if (!row) throw new NotFound('No such compendium entry');
    return row;
  });
  expireCompendium();
  return written;
}

/**
 * When a curator last marked a compendium entry reviewed, `null` while it
 * needs review: the admin's own read of the mark, which every compendium read
 * leaves out (M14.8). Uncached, since the compendium's cached reads are the
 * public ones; the reviewer is not read at all.
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {NotFound} no live compendium entry has this id — a coven's
 * ingredient and an id that is not one included.
 */
export async function readCompendiumReview(
  session: Session,
  id: string,
): Promise<CompendiumReview | null> {
  const curator = assertCurator(session);
  const found = RowId.safeParse(id).success ? await findCompendiumReview(curator, id) : undefined;
  if (!found) throw new NotFound('No such compendium entry');
  return found.reviewedAt ? { reviewedAt: found.reviewedAt } : null;
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

// The public entry route's read, held in the data cache beside the list's
// (claude-docs/db/compendium-cache.md). Cached whole: the address, the entry
// and everything its page lists, so a hit reaches Postgres for none of it.
const cachedEntry = cachedCompendiumRead('compendium-entry', async (slug: string) => {
  const address = await resolveCompendiumSlug(slug);
  if (address.kind === 'moved') return address satisfies CompendiumEntryPage;
  const { entry, movedAway } = address;
  return {
    kind: 'entry',
    detail: await ingredientDetailOf(null, entry),
    movedAway: movedAway ? { name: movedAway.name, slug: movedAway.slug } : null,
  } satisfies CompendiumEntryPage;
});

/**
 * What the public entry page reads for an address: the entry there with all
 * it lists, or the slug it moved to. It is not `getIngredient` and
 * `ingredientDetailOf` called in turn because it takes no session: every
 * viewer sees the compendium alike, so the whole read can be cached under the
 * `compendium` tag, which a coven's route cannot do with the same assembly.
 * That route reads `getIngredient` and `ingredientDetailOf` uncached, per viewer.
 *
 * @throws {NotFound} nothing is at `slug` and nothing redirects from it — a
 * coven's slug included, since a coven entry's existence is private. A refusal is
 * never cached.
 */
export function readCompendiumEntry(slug: string): Promise<CompendiumEntryPage> {
  return cachedEntry(slug);
}

/** What each field named by spelling is called in a refusal. */
const NOUN_OF: Record<CuratedField, string> = {
  celestialBodies: 'celestial body',
  zodiacSigns: 'zodiac sign',
};

const SPELLED_FIELDS = ['celestialBodies', 'zodiacSigns'] as const satisfies CuratedField[];

/**
 * `fields` and the checked lists holding curated values alone, as a
 * compendium entry does where a coven's ingredient keeps what was typed
 * (MB.162; DESIGN.md §5): each form and each deity a pick of a curated row
 * (MB.167), and the celestial bodies and signs of the entry and of each of its forms
 * (MB.219) each in the spelling of the live curated row it folds to. A list's
 * refusal is placed at the entry `input` sent, blanks counted, since parsing
 * drops blank celestial bodies and signs and the form numbers its rows by what it
 * sent. Read before the write rather than inside it, so an admin retiring a
 * row while another saves an entry naming it can leave that entry holding it.
 *
 * @throws {ValidationError} beside each value not picked or no live curated
 * row holds — every one at once, in the form's order, so the admin sees the
 * whole list to add.
 */
async function inCuratedValues(
  input: CompendiumWrite,
  parsed: IngredientFields,
  picked: PickedLists,
  held: readonly DeityRecord[],
): Promise<{
  fields: IngredientFields;
  children: Awaited<ReturnType<typeof resolvePicks>>['children'];
}> {
  const variants = picked.variants ?? [];
  const valuesOf = (field: CuratedField) => [
    ...(parsed[field] ?? []),
    ...variants.flatMap((variant) => variant[field]),
  ];
  const [picks, celestialBodies, zodiacSigns] = await Promise.all([
    resolvePicks('compendium', parsed, picked, held),
    curatedSpellings('celestialBodies', valuesOf('celestialBodies')),
    curatedSpellings('zodiacSigns', valuesOf('zodiacSigns')),
  ]);
  const spellingsOf = { celestialBodies, zodiacSigns };
  const spellingOf = (field: CuratedField, value: string) =>
    spellingsOf[field].get(foldVocabularyValue(value));

  // The entry's own lists, then each form's, as `input` sent them.
  const sent = [
    { at: [], lists: input },
    ...(input.variants ?? []).map((lists, index) => ({ at: ['variants', index], lists })),
  ];
  const spelled: ValidationIssue[] = [];
  for (const { at, lists } of sent) {
    for (const field of SPELLED_FIELDS) {
      (lists[field] ?? []).forEach((value, index) => {
        if (value.trim() === '' || spellingOf(field, value) !== undefined) return;
        spelled.push({
          path: [...at, field, index],
          message: `No curated ${NOUN_OF[field]} is called "${value.trim()}" — add it to the ${NOUN_OF[field]} list first`,
        });
      });
    }
  }
  const issues = [...picks.issues, ...spelled].sort(
    (a, b) => FIELD_ORDER.indexOf(String(a.path[0])) - FIELD_ORDER.indexOf(String(b.path[0])),
  );
  if (issues.length > 0) throw new ValidationError(issues);

  // Each list in its rows' spellings: every value has one, or it was refused above.
  const spell = <T extends Partial<Record<CuratedField, string[] | null>>>(lists: T): T => {
    const spelt = { ...lists };
    for (const field of SPELLED_FIELDS) {
      spelt[field] = lists[field]?.map(
        (value) => spellingOf(field, value) ?? value,
      ) as T[CuratedField];
    }
    return spelt;
  };
  return {
    fields: spell(picks.fields),
    children: { ...picks.children, variants: picks.children.variants.map(spell) },
  };
}

/** The curated fields in the order the form shows them, which is the order refusals are listed in. */
const FIELD_ORDER = [
  'form',
  'formId',
  'celestialBodies',
  'zodiacSigns',
  'deities',
  'categoryIds',
  'variants',
];

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
  const refused = await redirectRefusal([{ slug, entryId: excluding }], at);
  if (refused) throw refused;
}

/**
 * Soft-deletes a compendium entry, stamping who deleted it. Its folk names
 * and category links stay, and a spell holding it still reaches it
 * (claude-docs/db/spell-visibility.md, "What a spell holds").
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {NotFound} no live compendium entry has this id — one already
 * deleted, a coven's ingredient, and an id that is not one included.
 */
export async function deleteCompendiumEntry(session: Session, id: string): Promise<void> {
  const curator = assertCurator(session);
  await softDeleteIngredient(session, id, 'No such compendium entry', (write) =>
    write.softDeleteByIdInCompendium(curator, ingredients, id),
  );
  expireCompendium();
}

/**
 * How many covens hold this compendium entry in their cupboard, for the
 * curator's delete confirm (M12.25): a count, never a coven's name or id.
 * Lives here beside `deleteCompendiumEntry`, which the number is asked
 * before; the cupboard's own services are the coven's, under a membership.
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {NotFound} no live compendium entry has this id — a coven's
 * ingredient, one already deleted and an id that is not one included.
 */
export async function countCompendiumEntryUsers(session: Session, id: string): Promise<number> {
  const curator = assertCurator(session);
  const entry = RowId.safeParse(id).success ? await findOneIngredient([], id) : undefined;
  if (!entry) throw new NotFound('No such compendium entry');
  return countCovensUsing(curator, id);
}

/**
 * A write that broke one of the compendium's unique indexes, as a
 * `ValidationError` on the field that caused it; any other error unchanged.
 * An identity collision — a second entry under a formal name the compendium
 * holds, an oil beside the herb (MB.215) — is reported on `canonicalName`, or
 * on `name` for an entry with none, naming the entry holding it, read after
 * the write rolled back, and pointing at adding the form to that entry: a
 * label with no formal name keys as another entry's formal name (DESIGN.md
 * §5), so the input alone would not say which entry that is. A slug
 * collision names the entry holding the address, as the slug the two fold to
 * is not always one the admin can see in either input — unless another entry
 * holds the identity too, which is the collision to report: Postgres names
 * the first index it finds broken, and the address index is older than the
 * identity one, so the oil written under the herb's label meets the address
 * first. `id` is the entry an update writes, never its own collision.
 */
async function refuseCollision(
  error: unknown,
  fields: Pick<IngredientFields, 'name' | 'canonicalName'>,
  slug: string,
  id: string | undefined,
): Promise<never> {
  const refuse = (path: string, message: string) => {
    throw new ValidationError([{ path: [path], message }]);
  };
  const identity = (holder: IngredientRow | undefined) =>
    refuse(
      fields.canonicalName == null ? 'name' : 'canonicalName',
      holder
        ? `Already in the compendium as ${describeEntry(holder)} — add this form to it instead`
        : 'Already in the compendium',
    );

  switch (violatedUniqueIndex(error)) {
    case 'ingredients_compendium_identity_key_unique':
      identity(await findCompendiumEntryByIdentity(fields));
      break;
    case 'ingredients_compendium_slug_unique': {
      const twin = await findCompendiumEntryByIdentity(fields);
      if (twin && twin.id !== id) identity(twin);
      const holder = await findCompendiumEntryBySlug(slug);
      refuse(
        'name',
        addressTaken(
          holder ? describeEntry(holder) : 'Another compendium entry',
          slug,
          'change the name or formal name',
        ),
      );
    }
  }
  throw error;
}

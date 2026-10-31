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

// The compendium: the public list and entry reads (claude-docs/db/compendium-read.md, "The compendium read"),
// curator and admin writes (claude-docs/db/compendium-writes.md, "Compendium writes"),
// and addresses with redirects (claude-docs/db/ingredient-slugs.md, "Ingredient slugs").

// The list and its count, held in the data cache under the `compendium` tag, keyed by the parsed filter (claude-docs/db/compendium-cache.md).
const cachedPage = cachedCompendiumRead('compendium-page', findCompendiumPage);
const cachedCount = cachedCompendiumRead('compendium-count', findCompendiumCount);

/**
 * One page of the compendium under `filter`, best match first on a search, each entry carrying its score.
 * Parses the filter itself, and `viewer` is read only for the Reviewed setting
 * (claude-docs/db/compendium-writes.md, "Compendium service details").
 *
 * @throws {Forbidden} the filter sets Reviewed and `viewer` is not a curator.
 * @throws {ValidationError} a category or deity id is not a uuid, or the toxic setting is not in `TOXIC_FILTERS`.
 */
export async function listCompendium(
  filter: CompendiumFilterInput,
  page: PageRequest,
  viewer: Session | null = null,
): Promise<PageEntry<IngredientRow, CompendiumScore>[]> {
  return cachedPage(compendiumFilterFor(filter, viewer), page);
}

/**
 * How many entries the compendium holds under `filter`, and how many come before `start`; parsed as `listCompendium` parses.
 *
 * @throws {Forbidden} the filter sets Reviewed and `viewer` is not a curator.
 * @throws {ValidationError} a category or deity id is not a uuid, or the toxic setting is not in `TOXIC_FILTERS`.
 */
export async function countCompendium(
  filter: CompendiumFilterInput,
  start: Cursor | undefined,
  viewer: Session | null = null,
): Promise<PageCount> {
  return cachedCount(compendiumFilterFor(filter, viewer), start);
}

/**
 * One ingredient by id: a compendium entry for anyone, or with `workspaceId` that coven's own entry for its members
 * (claude-docs/db/compendium-writes.md, "Compendium service details").
 *
 * @throws {Forbidden} a coven is named and the caller is not in it.
 * @throws {NotFound} no such entry where the caller may look.
 */
export async function getIngredient(
  session: Session | null,
  id: string,
  workspaceId?: string | null,
): Promise<IngredientRow> {
  const memberships = await readersOf(session, workspaceId, { ingredient: ['read'] });

  // An id that is not a uuid names nothing and would be a driver error at the comparison.
  const row = RowId.safeParse(id).success ? await findOneIngredient(memberships, id) : undefined;
  if (row) return row;
  const [membership] = memberships;
  const held = membership && (await heldCompendiumEntry(membership, id));
  if (!held) throw new NotFound('No such ingredient');
  return held.entry;
}

/**
 * Creates a compendium entry with its folk names, substitutes, deities, references, categories and forms in one
 * transaction, curated values in their rows' spelling (claude-docs/db/compendium-writes.md, "Compendium service details").
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin, checked before the input is read.
 * @throws {ValidationError} the input breaks `CompendiumIngredientInput`, a curated pick, a collision, an unconfirmed
 * redirect end, a dead category, or a substitute or reference outside the compendium.
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
 * Replaces a compendium entry with `input`, the whole entry, so a field left out is cleared
 * (claude-docs/db/compendium-writes.md, "Compendium service details").
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {ValidationError} as `createCompendiumEntry`.
 * A save names the revision it read in `expectedRevision`: a newer one refuses it, and null writes whatever the row holds.
 *
 * @throws {StaleWrite} `expectedRevision` is not the entry's revision.
 * @throws {NotFound} no live compendium entry has this id.
 */
export async function updateCompendiumEntry(
  session: Session,
  id: string,
  input: CompendiumWrite,
  expectedRevision: number | null = null,
): Promise<IngredientRow> {
  const curator = assertCurator(session);
  const {
    fields: parsed,
    lists,
    picked,
  } = splitChildren(parseInput(CompendiumIngredientInput, input));
  // An id that is not a uuid names nothing and would be a driver error at the comparison.
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
    const [row] = await write.updateRevisionedInCompendium(
      curator,
      ingredients,
      id,
      expectedRevision,
      columns,
    );
    if (!row) throw new NotFound('No such compendium entry');
    if (moves) {
      await write.insertInCompendium(curator, retiredIngredientSlugs, {
        ingredientId: id,
        slug: current.slug,
        retiredAt: at,
      });
    }
    const touched = await writeChildren(
      write,
      [],
      id,
      { ...lists, ...curated.children, heldDeities: held },
      'replace',
      curator,
    );
    return touched ?? row;
  }).catch((error: unknown) => refuseCollision(error, fields, slug, id));
  expireCompendium();
  return written;
}

/**
 * Swaps the display name of a compendium entry with one of its folk names, as `promoteWorkspaceFolkName` does for a
 * coven's (claude-docs/db/compendium-writes.md, "Compendium service details").
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {ValidationError} the new display name collides, or its address is one another entry's redirect runs from.
 * @throws {NotFound} no live compendium entry has this id, or it holds no such live folk name.
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
 * Marks a compendium entry reviewed by this curator, or clears the mark; the only function that writes it
 * (claude-docs/db/compendium-writes.md, "Compendium service details").
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {NotFound} no live compendium entry has this id.
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
 * Hides a compendium entry from the public compendium, or shows it again. Admin screens, the audit queue and a coven's cupboard still see a hidden entry.
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {NotFound} no live compendium entry has this id.
 */
export async function setCompendiumEntryShown(
  session: Session,
  id: string,
  shown: boolean,
): Promise<IngredientRow> {
  const curator = assertCurator(session);
  if (!RowId.safeParse(id).success) throw new NotFound('No such compendium entry');
  const written = await withAudit(session, async (write) => {
    const [row] = await write.setShownInCompendium(curator, id, shown);
    if (!row) throw new NotFound('No such compendium entry');
    return row;
  });
  expireCompendium();
  return written;
}

/**
 * When a curator last marked a compendium entry reviewed, `null` while it needs review; uncached.
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {NotFound} no live compendium entry has this id.
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
 * The public route's one read of an address, taking no session: the live entry holding `slug`, or the current slug of
 * the entry whose redirect from `slug` is still running, for a 308.
 *
 * @throws {NotFound} nothing is at `slug` and nothing redirects from it.
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

// The public entry route's read, cached whole beside the list's (claude-docs/db/compendium-cache.md).
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
 * What the public entry page reads for an address: the entry with all it lists, or the slug it moved to. Takes no
 * session, so the whole read caches under the `compendium` tag (claude-docs/db/compendium-writes.md, "Compendium service details").
 *
 * @throws {NotFound} nothing is at `slug` and nothing redirects from it; never cached.
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
 * `fields` and the checked lists holding curated values alone, each in the spelling of the live row it folds to
 * (claude-docs/db/compendium-writes.md, "Compendium service details").
 *
 * @throws {ValidationError} beside each value not picked or no live curated row holds, every one at once.
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

/** Refuses a write whose slug another entry's redirect runs from, unless the admin confirmed ending it with `endRedirect`. */
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
 * Soft-deletes a compendium entry, stamping who deleted it; its folk names and category links stay
 * (claude-docs/db/spell-visibility.md, "What a spell holds").
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {NotFound} no live compendium entry has this id.
 */
export async function deleteCompendiumEntry(session: Session, id: string): Promise<void> {
  const curator = assertCurator(session);
  await softDeleteIngredient(session, id, 'No such compendium entry', (write) =>
    write.softDeleteByIdInCompendium(curator, ingredients, id),
  );
  expireCompendium();
}

/**
 * How many covens hold this compendium entry in their cupboard, a count only, for the delete confirm.
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {NotFound} no live compendium entry has this id.
 */
export async function countCompendiumEntryUsers(session: Session, id: string): Promise<number> {
  const curator = assertCurator(session);
  const entry = RowId.safeParse(id).success ? await findOneIngredient([], id) : undefined;
  if (!entry) throw new NotFound('No such compendium entry');
  return countCovensUsing(curator, id);
}

/**
 * A write that broke one of the compendium's unique indexes, as a `ValidationError` on the field that caused it;
 * any other error unchanged (claude-docs/db/compendium-writes.md, "Compendium service details").
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

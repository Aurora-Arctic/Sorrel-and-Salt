import 'server-only';
import {
  findAstrologyValueCount,
  findAstrologyValues,
  findOneBySlug,
  withAudit,
} from '../../../db/repository';
import { cachedCompendiumRead, expireCompendium } from '../../../lib/compendium-cache';
import { NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { slugify } from '../../../lib/slugify';
import { plural } from '../../../lib/text';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { parseInput } from '../../../lib/validation';
import { assertSiteAdmin } from '@/modules/identity';
import { planets, zodiacSigns } from '../schema/astrology';
import {
  type AstrologyValueInput,
  PlanetInput,
  ZodiacSignInput,
} from '../validation/astrology-value';
import { readableFilter } from './curated-lists';
import { liveRow, refuseSlugCollision } from './curated-writes';
import { refuseWhileHeld } from './held-entries';
import type { AstrologyValueFilter, AstrologyValueRow, CuratedField } from '../types';

// The two curated astrology vocabularies: their reads, public reference data
// like every curated vocabulary (MB.80), and their writes, the site admin's
// alone (MB.95). One code path for both, keyed by the ingredient list each
// curates. A compendium entry's planets and signs are spellings the
// vocabulary curates (MB.162), so a value a live entry's list holds is held:
// its delete is refused, and its rename is carried onto the list in the same
// write. A coven's ingredient never holds a value and is never rewritten: its
// spelling moves into the coven's in-use values, and an admin writes nothing
// of a coven's (M6.6).
//
// MB.95's rules apply "while the row is the last live spelling of its value",
// which every live row is: a value folds as a slug does, trimmed and
// lower-cased, so two live rows of one fold would share a slug, which the
// partial unique index refuses.

/** What each vocabulary is called, read and checked by. */
const VOCABULARY = {
  planets: {
    table: planets,
    input: PlanetInput,
    noun: 'planet',
    listNoun: 'planets',
    slugIndex: 'planets_slug_unique',
    holding: (name: string) => ({ planet: name }),
  },
  zodiacSigns: {
    table: zodiacSigns,
    input: ZodiacSignInput,
    noun: 'sign',
    listNoun: 'zodiac signs',
    slugIndex: 'zodiac_signs_slug_unique',
    holding: (name: string) => ({ zodiacSign: name }),
  },
} as const satisfies Record<CuratedField, unknown>;

/** Either vocabulary's table, so a shared step reads whichever `field` names. */
type AstrologyTable = (typeof VOCABULARY)[CuratedField]['table'];

// The list and its count, held in the data cache under the `compendium` tag
// (claude-docs/db/compendium-cache.md). Keyed by the field's name rather than
// handed its table, since the arguments are the cache key.
const cachedPage = cachedCompendiumRead(
  'astrology-page',
  (field: CuratedField, filter: AstrologyValueFilter, page: PageRequest) =>
    findAstrologyValues(VOCABULARY[field].table, filter, page),
);
const cachedCount = cachedCompendiumRead(
  'astrology-count',
  (field: CuratedField, filter: AstrologyValueFilter, start: Cursor | undefined) =>
    findAstrologyValueCount(VOCABULARY[field].table, filter, start),
);

/**
 * One page of `field`'s vocabulary under `filter`, alphabetical by name, for
 * `planets`, `zodiacSigns` and the admin pages' lists: a public read (MB.80),
 * so no session. A blank query is no query.
 */
export function listAstrologyValues(
  field: CuratedField,
  filter: AstrologyValueFilter,
  page: PageRequest,
): Promise<PageEntry<AstrologyValueRow>[]> {
  return cachedPage(field, readableFilter(filter) ?? {}, page);
}

/**
 * How many rows `listAstrologyValues` pages under `filter`, and how many come
 * before `start` — a page's first row, none on an empty page: "Page X of Y".
 */
export function countAstrologyValues(
  field: CuratedField,
  filter: AstrologyValueFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  return cachedCount(field, readableFilter(filter) ?? {}, start);
}

/**
 * The live row of `field`'s vocabulary at this address — how an admin page
 * opens one to edit.
 *
 * @throws {NotFound} no live row holds the slug.
 */
export async function getAstrologyValueBySlug(
  field: CuratedField,
  slug: string,
): Promise<AstrologyValueRow> {
  const row = await findOneBySlug(VOCABULARY[field].table, slug);
  if (!row) throw new NotFound(`No such ${VOCABULARY[field].noun}`);
  return row;
}

/**
 * Adds a planet or a sign, its slug derived from the name.
 *
 * @throws {Forbidden} the caller is not a site admin — checked before the
 * input is read.
 * @throws {ValidationError} the input breaks the vocabulary's schema, or its
 * slug is a live row's.
 */
export async function createAstrologyValue(
  session: Session,
  field: CuratedField,
  input: AstrologyValueInput,
): Promise<AstrologyValueRow> {
  assertSiteAdmin(session);
  const vocabulary = VOCABULARY[field];
  const fields = parseInput(vocabulary.input, input);
  const slug = slugify(fields.name);

  const written = await withAudit(session, async (write) => {
    const [row] = await write.insert(vocabulary.table, { ...fields, slug });
    return row;
  }).catch((error: unknown) => refuseSlugCollision(vocabulary, error, slug));
  expireCompendium();
  return written;
}

/**
 * Rewrites a planet or a sign whole, its slug following the name. Its
 * `seedKey` is left as it was, so a renamed seeded row is still the seed's
 * (MB.171).
 *
 * A rename — a change of case included — carries the new name onto every live
 * compendium entry whose list holds the old one, in place and in the same
 * transaction; no slug moves, since a planet or a sign is no part of an
 * entry's identity or slug. A soft-deleted entry keeps the old spelling.
 *
 * @throws {Forbidden} the caller is not a site admin.
 * @throws {ValidationError} as `createAstrologyValue` throws it, the row's
 * own slug excepted.
 * @throws {NotFound} no live row of the vocabulary has this id.
 */
export async function updateAstrologyValue(
  session: Session,
  field: CuratedField,
  id: string,
  input: AstrologyValueInput,
): Promise<AstrologyValueRow> {
  const admin = assertSiteAdmin(session);
  const vocabulary = VOCABULARY[field];
  const fields = parseInput(vocabulary.input, input);
  const current = await liveRow<AstrologyTable>(vocabulary, id);
  const slug = slugify(fields.name);

  const written = await withAudit(session, async (write) => {
    const [row] = await write.updateById(vocabulary.table, id, { ...fields, slug });
    if (!row) throw new NotFound(`No such ${vocabulary.noun}`);
    if (current.name !== fields.name) {
      await write.carryAstrologyRename(admin, field, current.name, fields.name);
    }
    return row;
  }).catch((error: unknown) => refuseSlugCollision(vocabulary, error, slug));
  expireCompendium();
  return written;
}

/**
 * Soft-deletes a planet or a sign no live compendium entry's list holds. A
 * coven's ingredient keeps what it wrote, which moves into that coven's
 * in-use values.
 *
 * The entries are read before the transaction, so an entry saved with the
 * value in the instant between is left holding a retired spelling.
 *
 * @throws {Forbidden} the caller is not a site admin, or a live compendium
 * entry holds the value — the message names the entries.
 * @throws {NotFound} no live row of the vocabulary has this id.
 */
export async function deleteAstrologyValue(
  session: Session,
  field: CuratedField,
  id: string,
): Promise<void> {
  assertSiteAdmin(session);
  const vocabulary = VOCABULARY[field];
  const row = await liveRow<AstrologyTable>(vocabulary, id);
  await refuseWhileHeld(vocabulary.holding(row.name), {
    name: row.name,
    holding: `is among the ${vocabulary.listNoun} of`,
    remedy: (count) => `Take it off ${plural(count, 'its', 'their')} ${vocabulary.listNoun} first.`,
  });

  await withAudit(session, async (write) => {
    const [deleted] = await write.softDeleteByIds(vocabulary.table, [id]);
    if (!deleted) throw new NotFound(`No such ${vocabulary.noun}`);
  });
  expireCompendium();
}

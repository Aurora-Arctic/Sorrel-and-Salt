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
import { assertCurator } from '@/modules/identity';
import { celestialBodies, zodiacSigns } from '../schema/astrology';
import {
  type AstrologyValueInput,
  CelestialBodyInput,
  ZodiacSignInput,
} from '../validation/astrology-value';
import { readableFilter } from './curated-lists';
import { liveRow, refuseSlugCollision } from './curated-writes';
import { refuseWhileHeld } from './held-entries';
import type { AstrologyValueFilter, AstrologyValueRow, CuratedField } from '../types';

// The two curated astrology vocabularies, one code path keyed by the ingredient list each curates. Reads are public; writes are
// for a curator or an admin alone (claude-docs/db/astrology-vocabularies.md, "Astrology service details").

/** What each vocabulary is called, read and checked by. */
const VOCABULARY = {
  celestialBodies: {
    table: celestialBodies,
    input: CelestialBodyInput,
    noun: 'celestial body',
    listNoun: 'celestial bodies',
    slugIndex: 'celestial_bodies_slug_unique',
    holding: (name: string) => ({ celestialBodies: [name] }),
  },
  zodiacSigns: {
    table: zodiacSigns,
    input: ZodiacSignInput,
    noun: 'sign',
    listNoun: 'zodiac signs',
    slugIndex: 'zodiac_signs_slug_unique',
    holding: (name: string) => ({ zodiacSigns: [name] }),
  },
} as const satisfies Record<CuratedField, unknown>;

/** Either vocabulary's table, so a shared step reads whichever `field` names. */
type AstrologyTable = (typeof VOCABULARY)[CuratedField]['table'];

// The list and its count, held in the data cache under the `compendium` tag (claude-docs/db/compendium-cache.md); keyed by the field's name since the arguments are the cache key.
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

/** One page of `field`'s vocabulary under `filter`, alphabetical by name: a public read, so no session. A blank query is no query. */
export function listAstrologyValues(
  field: CuratedField,
  filter: AstrologyValueFilter,
  page: PageRequest,
): Promise<PageEntry<AstrologyValueRow>[]> {
  return cachedPage(field, readableFilter(filter), page);
}

/** How many rows `listAstrologyValues` pages under `filter`, and how many come before `start`: "Page X of Y". */
export function countAstrologyValues(
  field: CuratedField,
  filter: AstrologyValueFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  return cachedCount(field, readableFilter(filter), start);
}

/**
 * The live row of `field`'s vocabulary at this address, for an admin page to edit.
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
 * Adds a celestial body or a sign, its slug derived from the name.
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {ValidationError} the input breaks the vocabulary's schema, or its slug is a live row's.
 */
export async function createAstrologyValue(
  session: Session,
  field: CuratedField,
  input: AstrologyValueInput,
): Promise<AstrologyValueRow> {
  assertCurator(session);
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
 * Rewrites a celestial body or a sign whole, its slug following the name, and carries a rename onto every live compendium entry's
 * list (claude-docs/db/astrology-vocabularies.md, "Astrology service details"). Its `seedKey` is left as it was.
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {ValidationError} as `createAstrologyValue` throws it, the row's own slug excepted.
 * @throws {NotFound} no live row of the vocabulary has this id.
 */
export async function updateAstrologyValue(
  session: Session,
  field: CuratedField,
  id: string,
  input: AstrologyValueInput,
): Promise<AstrologyValueRow> {
  const curator = assertCurator(session);
  const vocabulary = VOCABULARY[field];
  const fields = parseInput(vocabulary.input, input);
  const current = await liveRow<AstrologyTable>(vocabulary, id);
  const slug = slugify(fields.name);

  const written = await withAudit(session, async (write) => {
    const [row] = await write.updateById(vocabulary.table, id, { ...fields, slug });
    if (!row) throw new NotFound(`No such ${vocabulary.noun}`);
    if (current.name !== fields.name) {
      await write.carryAstrologyRename(curator, field, current.name, fields.name);
    }
    return row;
  }).catch((error: unknown) => refuseSlugCollision(vocabulary, error, slug));
  expireCompendium();
  return written;
}

/**
 * Soft-deletes a celestial body or a sign no live compendium entry's list holds (claude-docs/db/astrology-vocabularies.md, "Astrology service details").
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin, or a live entry holds the value.
 * @throws {NotFound} no live row of the vocabulary has this id.
 */
export async function deleteAstrologyValue(
  session: Session,
  field: CuratedField,
  id: string,
): Promise<void> {
  assertCurator(session);
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

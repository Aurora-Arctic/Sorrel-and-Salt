import 'server-only';
import {
  findDeityPage,
  findOneBySlug,
  findPage,
  findPageCount,
  withAudit,
} from '../../../db/repository';
import { expireCompendium } from '../../../lib/compendium-cache';
import { NotFound } from '../../../lib/errors';
import { allPages } from '../../../lib/pagination';
import type { Session } from '../../../lib/session';
import { deitySlug, slugify } from '../../../lib/slugify';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { parseInput } from '../../../lib/validation';
import { assertSiteAdmin } from '@/modules/identity';
import { deities, deityTraditions } from '../schema/deities';
import { DeityTraditionInput } from '../validation/deity-tradition';
import { deleteGroup, refuseSlugCollision, updateGroup } from './curated-writes';
import type { CuratedGroup, DeityTraditionRow } from '../types';

// The deity traditions: their reads, public reference data like every curated
// vocabulary (MB.80), and their writes, the site admin's alone (MB.132), in
// the form groups' shape (M5.6b). A deity's slug is its name and its
// tradition's (MB.132), so a rename moves every live deity's slug under the
// tradition, and a delete first moves its live deities to the tradition the
// admin names, each re-slugged there. The deities stay curated either way, so
// neither a compendium entry's pick nor a coven's is orphaned, and no
// ingredient is rewritten: a link holds a deity's name and id, not its slug
// (claude-docs/design-decisions/mb.132-admin-deities.md).

/** The traditions, and the deities under them, which a rename or delete re-slugs under the tradition's name. */
const TRADITIONS: CuratedGroup<typeof deityTraditions> = {
  table: deityTraditions,
  slugIndex: 'deity_traditions_slug_unique',
  noun: 'tradition',
  members: {
    table: deities,
    slugIndex: 'deities_slug_unique',
    noun: 'deity',
    nouns: 'deities',
    parentColumn: 'traditionId',
    slugOf: deitySlug,
    under: (traditionId) => allPages((page) => findDeityPage({ traditionId }, page)),
  },
};
/** One page of the live traditions, alphabetical by name (MB.35): a deity's tradition is picked from these. */
export function listDeityTraditions(page: PageRequest): Promise<PageEntry<DeityTraditionRow>[]> {
  return findPage(deityTraditions, [deityTraditions.name], page);
}

/**
 * How many live traditions `listDeityTraditions` pages, and how many come before `start`
 * — a page's first row, none on an empty page: "Page X of Y" on the admin page.
 */
export function countDeityTraditions(start: Cursor | undefined): Promise<PageCount> {
  return findPageCount(deityTraditions, [deityTraditions.name], start);
}

/**
 * The live tradition at this address — how the admin page opens one to edit.
 *
 * @throws {NotFound} no live tradition holds the slug.
 */
export async function getDeityTraditionBySlug(slug: string): Promise<DeityTraditionRow> {
  const row = await findOneBySlug(deityTraditions, slug);
  if (!row) throw new NotFound('No such tradition');
  return row;
}

/**
 * Adds a tradition, its slug derived from the name.
 *
 * @throws {Forbidden} the caller is not a site admin — checked before the
 * input is read.
 * @throws {ValidationError} the input breaks `DeityTraditionInput`, or its
 * slug is a live tradition's.
 */
export async function createDeityTradition(
  session: Session,
  input: DeityTraditionInput,
): Promise<DeityTraditionRow> {
  assertSiteAdmin(session);
  const fields = parseInput(DeityTraditionInput, input);
  const slug = slugify(fields.name);

  const written = await withAudit(session, async (write) => {
    const [row] = await write.insert(deityTraditions, { ...fields, slug });
    return row;
  }).catch((error: unknown) => refuseSlugCollision(TRADITIONS, error, slug));
  expireCompendium();
  return written;
}

/**
 * Rewrites a tradition whole, its slug following the name, and on a rename
 * the slug of every live deity under it, in the same transaction. Its
 * `seedKey` is left as it was, so a renamed seeded row is still the seed's
 * (MB.171). It touches no ingredient: a link holds the deity's name, not its
 * tradition's.
 *
 * The deities are read before the transaction, so one added under the
 * tradition in the instant between keeps the slug it was given.
 *
 * @throws {Forbidden} the caller is not a site admin.
 * @throws {ValidationError} as `createDeityTradition` throws it, the row's
 * own slug excepted; on `name`, a rename that would move a deity onto another
 * deity's address, naming both.
 * @throws {NotFound} no live tradition has this id.
 */
export async function updateDeityTradition(
  session: Session,
  id: string,
  input: DeityTraditionInput,
): Promise<DeityTraditionRow> {
  assertSiteAdmin(session);
  const fields = parseInput(DeityTraditionInput, input);
  const written = await updateGroup(session, TRADITIONS, id, fields);
  expireCompendium();
  return written;
}

/**
 * Soft-deletes a tradition, first moving its live deities to the tradition
 * `moveTo` names, each re-slugged under it, in the same transaction. A
 * tradition with no live deity needs no `moveTo`.
 *
 * The deities are read before the transaction, so one added under the
 * tradition in the instant between is left under a deleted one, which reads
 * as uncurated.
 *
 * @throws {Forbidden} the caller is not a site admin.
 * @throws {ValidationError} on `moveTo`, the tradition has live deities and
 * `moveTo` names no other live tradition, or a deity would move onto another
 * deity's address, naming both.
 * @throws {NotFound} no live tradition has this id.
 */
export async function deleteDeityTradition(
  session: Session,
  id: string,
  moveTo?: string,
): Promise<void> {
  assertSiteAdmin(session);
  await deleteGroup(session, TRADITIONS, id, moveTo);
  expireCompendium();
}

import 'server-only';
import {
  findDeityPage,
  findOneById,
  findOneBySlug,
  findPage,
  findPageCount,
  withAudit,
} from '../../../db/repository';
import { expireCompendium } from '../../../lib/compendium-cache';
import { NotFound, ValidationError } from '../../../lib/errors';
import { MAX_PAGE_SIZE } from '../../../lib/pagination';
import type { Session } from '../../../lib/session';
import { deitySlug, slugify } from '../../../lib/slugify';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { RowId, parseInput } from '../../../lib/validation';
import { assertSiteAdmin } from '@/modules/identity';
import { deities, deityTraditions } from '../schema/deities';
import { DeityTraditionInput } from '../validation/deity-tradition';
import { refusal, refuseCollidingMoves } from './group-moves';
import type { DeityRow, DeityTraditionRow, GroupMove, MovedRows } from '../types';

// The deity traditions: their reads, public reference data like every curated
// vocabulary (MB.80), and their writes, the site admin's alone (MB.132), in
// the form groups' shape (M5.6b). A deity's slug is its name and its
// tradition's (MB.132), so a rename moves every live deity's slug under the
// tradition, and a delete first moves its live deities to the tradition the
// admin names, each re-slugged there. The deities stay curated either way, so
// neither a compendium entry's pick nor a coven's is orphaned, and no
// ingredient is rewritten: a link holds a deity's name and id, not its slug
// (claude-docs/design-decisions/mb.132-admin-deities.md).

/** The deities a tradition's rename or delete moves, re-slugged under its name. */
const DEITIES: MovedRows = { table: deities, slugIndex: 'deities_slug_unique', noun: 'deity' };

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
  }).catch((error: unknown) => refuseCollision(error, slug));
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
  const current = await liveTradition(id);
  const slug = slugify(fields.name);
  const moves = current.name === fields.name ? [] : movedUnder(await deitiesUnder(id), fields.name);
  const refuse = refusal(
    DEITIES,
    ['name'],
    (deity) => `Renaming the tradition would move "${deity.name}" to`,
  );
  await refuseCollidingMoves(DEITIES, moves, refuse);

  const written = await withAudit(session, async (write) => {
    const [row] = await write.updateById(deityTraditions, id, { ...fields, slug });
    if (!row) throw new NotFound('No such tradition');
    for (const { row: deity, slug: moved } of moves) {
      await write.updateById(deities, deity.id, { slug: moved });
    }
    return row;
  }).catch(async (error: unknown) => {
    await refuseCollidingMoves(DEITIES, moves, refuse, error);
    return refuseCollision(error, slug);
  });
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
  await liveTradition(id);
  const under = await deitiesUnder(id);
  const target = under.length > 0 ? await moveTarget(id, moveTo, under.length) : undefined;
  const moves = target ? movedUnder(under, target.name) : [];
  const refuse = refusal(DEITIES, ['moveTo'], (deity) => `Moving "${deity.name}" would give it`);
  await refuseCollidingMoves(DEITIES, moves, refuse);

  await withAudit(session, async (write) => {
    for (const { row: deity, slug } of moves) {
      await write.updateById(deities, deity.id, { traditionId: target?.id, slug });
    }
    const [row] = await write.softDeleteByIds(deityTraditions, [id]);
    if (!row) throw new NotFound('No such tradition');
  }).catch(async (error: unknown) => {
    await refuseCollidingMoves(DEITIES, moves, refuse, error);
    throw error;
  });
  expireCompendium();
}

/**
 * The live tradition `id` names.
 *
 * @throws {NotFound} none does — an id that is not a uuid included, which
 * names nothing and would be a driver error at the comparison.
 */
async function liveTradition(id: string): Promise<DeityTraditionRow> {
  const row = RowId.safeParse(id).success ? await findOneById(deityTraditions, id) : undefined;
  if (!row) throw new NotFound('No such tradition');
  return row;
}

/**
 * Every live deity under the tradition, walked a page at a time through the
 * deities' own reader, so "live" means what the list means by it.
 */
async function deitiesUnder(traditionId: string): Promise<DeityRow[]> {
  const rows: DeityRow[] = [];
  let after: Cursor | undefined;
  for (;;) {
    const page = await findDeityPage(
      { traditionId },
      { after, limit: MAX_PAGE_SIZE, inverted: false },
    );
    rows.push(...page.map(({ node }) => node));
    if (page.length < MAX_PAGE_SIZE) return rows;
    after = page[page.length - 1].cursor;
  }
}

/** The deities, each beside the slug `traditionName` gives it. */
function movedUnder(rows: readonly DeityRow[], traditionName: string): GroupMove[] {
  return rows.map((deity) => ({ row: deity, slug: deitySlug(deity.name, traditionName) }));
}

/**
 * The live tradition a delete's `count` deities move to, or the refusal on
 * `moveTo` when none is named, or it names the tradition itself or no other
 * live tradition.
 */
async function moveTarget(
  id: string,
  moveTo: string | undefined,
  count: number,
): Promise<DeityTraditionRow> {
  const them = `${count} ${count === 1 ? 'deity' : 'deities'}`;
  if (moveTo === undefined) {
    throw new ValidationError([
      { path: ['moveTo'], message: `Choose a tradition to move its ${them} to` },
    ]);
  }
  const target =
    moveTo !== id && RowId.safeParse(moveTo).success
      ? await findOneById(deityTraditions, moveTo)
      : undefined;
  if (!target) {
    throw new ValidationError([
      { path: ['moveTo'], message: `Choose another live tradition to move its ${them} to` },
    ]);
  }
  return target;
}

/**
 * A write that broke the tradition slug index, as a `ValidationError` on
 * `name` — the slug is derived and has no field of its own (MB.43) — naming
 * the tradition holding the address; any other error unchanged.
 */
async function refuseCollision(error: unknown, slug: string): Promise<never> {
  if (violatedUniqueIndex(error) === 'deity_traditions_slug_unique') {
    const holder = await findOneBySlug(deityTraditions, slug);
    throw new ValidationError([
      {
        path: ['name'],
        message: `${holder ? `"${holder.name}"` : 'Another tradition'} already has the address "${slug}" — choose another name`,
      },
    ]);
  }
  throw error;
}

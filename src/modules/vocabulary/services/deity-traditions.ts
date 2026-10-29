import 'server-only';
import {
  findDeityPage,
  findGroupCount,
  findGroupPage,
  findOneBySlug,
  withAudit,
} from '../../../db/repository';
import { expireCompendium } from '../../../lib/compendium-cache';
import { NotFound } from '../../../lib/errors';
import { allPages } from '../../../lib/pagination';
import type { Session } from '../../../lib/session';
import { deitySlug, slugify } from '../../../lib/slugify';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { parseInput } from '../../../lib/validation';
import { assertCurator } from '@/modules/identity';
import { deities, deityTraditions } from '../schema/deities';
import { DeityTraditionInput } from '../validation/deity-tradition';
import { deleteGroup, refuseSlugCollision, updateGroup } from './curated-writes';
import type { CuratedGroup, DeityTraditionRow, GroupFilter } from '../types';

// The deity traditions: public reads, and writes for a curator or an admin alone. A rename or delete re-slugs the deities under
// them (claude-docs/db/deity-vocabulary.md, "Deity tradition service details").

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
/** One page of the live traditions, alphabetical by name; the admin's list narrows them by a name fragment, every other reader passes no filter. */
export function listDeityTraditions(
  page: PageRequest,
  filter: GroupFilter = {},
): Promise<PageEntry<DeityTraditionRow>[]> {
  return findGroupPage(deityTraditions, filter, page);
}

/** How many live traditions `listDeityTraditions` pages under `filter`, and how many come before `start`: "Page X of Y". */
export function countDeityTraditions(
  start: Cursor | undefined,
  filter: GroupFilter = {},
): Promise<PageCount> {
  return findGroupCount(deityTraditions, filter, start);
}

/**
 * The live tradition at this address, for the admin page to edit.
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
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {ValidationError} the input breaks `DeityTraditionInput`, or its slug is a live tradition's.
 */
export async function createDeityTradition(
  session: Session,
  input: DeityTraditionInput,
): Promise<DeityTraditionRow> {
  assertCurator(session);
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
 * Rewrites a tradition whole, its slug following the name, and on a rename the slug of every live deity under it
 * (claude-docs/db/deity-vocabulary.md, "Deity tradition service details"). Its `seedKey` is left as it was.
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {ValidationError} as `createDeityTradition` throws it, the row's own slug excepted; on `name`, a rename that would move a deity onto another's address.
 * @throws {NotFound} no live tradition has this id.
 */
export async function updateDeityTradition(
  session: Session,
  id: string,
  input: DeityTraditionInput,
): Promise<DeityTraditionRow> {
  assertCurator(session);
  const fields = parseInput(DeityTraditionInput, input);
  const written = await updateGroup(session, TRADITIONS, id, fields);
  expireCompendium();
  return written;
}

/**
 * Soft-deletes a tradition, first moving its live deities to the tradition `moveTo` names (claude-docs/db/deity-vocabulary.md,
 * "Deity tradition service details").
 *
 * @throws {Forbidden} the caller is neither a curator nor an admin.
 * @throws {ValidationError} on `moveTo`, a missing target or a deity that would move onto another's address.
 * @throws {NotFound} no live tradition has this id.
 */
export async function deleteDeityTradition(
  session: Session,
  id: string,
  moveTo?: string,
): Promise<void> {
  assertCurator(session);
  await deleteGroup(session, TRADITIONS, id, moveTo);
  expireCompendium();
}

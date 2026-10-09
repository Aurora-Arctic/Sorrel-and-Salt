import 'server-only';
import {
  findDeityCount,
  findDeityPage,
  findOneById,
  findOneBySlug,
  withAudit,
} from '../../../db/repository';
import { Forbidden, NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { deitySlug } from '../../../lib/slugify';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { violatedUniqueIndex } from '../../../lib/unique-violation';
import { RowId, parseInput } from '../../../lib/validation';
import { assertSiteAdmin } from '@/modules/identity';
import { deities, deityTraditions } from '../schema/deities';
import { DeityInput } from '../validation/deity';
import { heldBy } from './held-entries';
import type { DeityFilter, DeityRow } from '../types';

// The curated deity vocabulary: its reads, public reference data like every
// curated vocabulary (MB.80), and its writes, the site admin's alone
// (MB.132). A compendium entry's deities are picks (MB.167), so a deity a live
// entry links holds: its delete is refused, and its rename is carried onto the
// entry's link in the same write. A deity is no part of an entry's identity or
// slug, so the rewrite touches the link's name alone. A deity's own slug is its
// name and its tradition's (MB.132), as a form's is its name and its group's. A coven's link never
// holds a deity and is never rewritten: what it picked stays, and an admin
// writes nothing of a coven's (M6.6).

/**
 * One page of the curated deities under `filter`, each under its tradition,
 * for the admin page's list: a public read (MB.80), so no session, and the
 * finder decides what counts as curated — a live deity under a live
 * tradition. A blank query is no query, and a tradition id that is not a uuid
 * names no tradition, so lists nothing, as `listIngredientFormValues` reads
 * its filter.
 */
export async function listDeities(
  filter: DeityFilter,
  page: PageRequest,
): Promise<PageEntry<DeityRow>[]> {
  const read = readable(filter);
  return read ? findDeityPage(read, page) : [];
}

/**
 * How many deities `listDeities` pages under `filter`, and how many come
 * before `start` — a page's first row, none on an empty page: "Page X of Y".
 */
export async function countDeities(
  filter: DeityFilter,
  start: Cursor | undefined,
): Promise<PageCount> {
  const read = readable(filter);
  return read ? findDeityCount(read, start) : { totalCount: 0, countBefore: null };
}

/**
 * The live deity at this address — how the admin page opens one to edit.
 *
 * @throws {NotFound} no live deity holds the slug.
 */
export async function getDeityBySlug(slug: string): Promise<DeityRow> {
  const row = await findOneBySlug(deities, slug);
  if (!row) throw new NotFound('No such deity');
  return row;
}

/**
 * Adds a deity, its slug derived from the name and the tradition's name.
 *
 * @throws {Forbidden} the caller is not a site admin — checked before the
 * input is read.
 * @throws {ValidationError} the input breaks `DeityInput`, names no live
 * tradition, or its slug is a live deity's.
 */
export async function createDeity(session: Session, input: DeityInput): Promise<DeityRow> {
  assertSiteAdmin(session);
  const { fields, traditionName } = await parseDeity(input);
  const slug = deitySlug(fields.name, traditionName);

  return withAudit(session, async (write) => {
    const [row] = await write.insert(deities, { ...fields, slug });
    return row;
  }).catch((error: unknown) => refuseCollision(error, slug));
}

/**
 * Rewrites a deity whole, its slug following the name and the tradition. Its `seedKey` is left
 * as it was, so a renamed seeded row is still the seed's (MB.171).
 *
 * A rename — a change of case included — carries the new name onto every live
 * compendium entry's link to the deity, in place and in the same
 * transaction; no slug moves, since a deity is no part of an entry's identity
 * or slug. A change of tradition alone rewrites nothing, since a link holds
 * the deity's name and not its tradition's.
 *
 * @throws {Forbidden} the caller is not a site admin.
 * @throws {ValidationError} as `createDeity` throws it, the row's own slug
 * excepted.
 * @throws {NotFound} no live deity has this id.
 */
export async function updateDeity(
  session: Session,
  id: string,
  input: DeityInput,
): Promise<DeityRow> {
  const admin = assertSiteAdmin(session);
  const { fields, traditionName } = await parseDeity(input);
  const current = await liveDeity(id);
  const slug = deitySlug(fields.name, traditionName);

  return withAudit(session, async (write) => {
    const [row] = await write.updateById(deities, id, { ...fields, slug });
    if (!row) throw new NotFound('No such deity');
    if (current.name !== fields.name) await write.carryDeityRename(admin, id, fields.name);
    return row;
  }).catch((error: unknown) => refuseCollision(error, slug));
}

/**
 * Soft-deletes a deity no live compendium entry links. A coven's ingredient
 * keeps its link and stops reading it as one — the link is the coven's, and
 * an admin writes nothing of a coven's (M6.6) — so its name moves into that
 * coven's in-use values.
 *
 * The entries are read before the transaction, so an entry linking the deity
 * in the instant between is left holding a deleted one, which reads as its name.
 *
 * @throws {Forbidden} the caller is not a site admin, or a live compendium
 * entry links the deity — the message names the entries.
 * @throws {NotFound} no live deity has this id.
 */
export async function deleteDeity(session: Session, id: string): Promise<void> {
  assertSiteAdmin(session);
  const deity = await liveDeity(id);
  await refuseWhilePicked(deity);

  await withAudit(session, async (write) => {
    const [row] = await write.softDeleteByIds(deities, [id]);
    if (!row) throw new NotFound('No such deity');
  });
}

/**
 * The filter as the repository reads it, its query trimmed and a blank one
 * dropped; `undefined` for a tradition id that is not a uuid, which names
 * nothing and would be a driver error at the comparison.
 */
function readable({ query, traditionId }: DeityFilter): DeityFilter | undefined {
  if (traditionId !== undefined && !RowId.safeParse(traditionId).success) return undefined;
  return { query: query?.trim() || undefined, traditionId };
}

/**
 * The input parsed, its tradition checked live — a foreign key admits a
 * retired one — and the tradition's name, which the slug carries.
 */
async function parseDeity(
  input: DeityInput,
): Promise<{ fields: DeityInput; traditionName: string }> {
  const fields = parseInput(DeityInput, input);
  const tradition = await findOneById(deityTraditions, fields.traditionId);
  if (!tradition) {
    throw new ValidationError([{ path: ['traditionId'], message: 'Choose a tradition' }]);
  }
  return { fields, traditionName: tradition.name };
}

/**
 * The live deity `id` names.
 *
 * @throws {NotFound} none does — an id that is not a uuid included, which
 * names nothing and would be a driver error at the comparison.
 */
async function liveDeity(id: string): Promise<DeityRow> {
  const row = RowId.safeParse(id).success ? await findOneById(deities, id) : undefined;
  if (!row) throw new NotFound('No such deity');
  return row;
}

/**
 * The refusal of a delete while live compendium entries link the deity: the
 * first few by name, each told apart from a namesake, and how many more, read
 * through the compendium's own filter on the pick, which the
 * `ingredient_deities_deity_id_idx` index answers.
 */
async function refuseWhilePicked(deity: DeityRow): Promise<void> {
  const held = await heldBy({ deityId: deity.id });
  if (!held) return;
  const { totalCount, list } = held;
  const entries = totalCount === 1 ? 'entry' : 'entries';
  const their = totalCount === 1 ? 'its' : 'their';
  throw new Forbidden(
    `"${deity.name}" is among the deities of ${totalCount} compendium ${entries} — ${list}. Take it off ${their} deities first.`,
  );
}

/**
 * A write that broke the deity slug index, as a `ValidationError` on `name` —
 * the slug is derived and has no field of its own (MB.43) — naming the deity
 * holding the address; any other error unchanged.
 */
async function refuseCollision(error: unknown, slug: string): Promise<never> {
  if (violatedUniqueIndex(error) === 'deities_slug_unique') {
    const holder = await findOneBySlug(deities, slug);
    throw new ValidationError([
      {
        path: ['name'],
        message: `${holder ? `"${holder.name}"` : 'Another deity'} already has the address "${slug}" — choose another name or tradition`,
      },
    ]);
  }
  throw error;
}

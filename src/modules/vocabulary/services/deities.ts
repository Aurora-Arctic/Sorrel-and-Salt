import 'server-only';
import { findDeityCount, findDeityPage, findOneBySlug, withAudit } from '../../../db/repository';
import { cachedCompendiumRead, expireCompendium } from '../../../lib/compendium-cache';
import { NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { deitySlug } from '../../../lib/slugify';
import { plural } from '../../../lib/text';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { assertSiteAdmin } from '@/modules/identity';
import { deities, deityTraditions } from '../schema/deities';
import { DeityInput } from '../validation/deity';
import { cachedFilteredList } from './curated-lists';
import { liveRow, parseUnderLiveParent, refuseSlugCollision } from './curated-writes';
import { refuseWhileHeld } from './held-entries';
import type { CuratedVocabulary, DeityFilter, DeityRow } from '../types';

// The curated deity vocabulary: its reads, public reference data like every
// curated vocabulary (MB.80), and its writes, the site admin's alone
// (MB.132). A compendium entry's deities are picks (MB.167), so a deity a live
// entry links holds: its delete is refused, and its rename is carried onto the
// entry's link in the same write. A deity is no part of an entry's identity or
// slug, so the rewrite touches the link's name alone. A deity's own slug is its
// name and its tradition's (MB.132), as a form's is its name and its group's. A coven's link never
// holds a deity and is never rewritten: what it picked stays, and an admin
// writes nothing of a coven's (M6.6).

// The list and its count, held in the data cache under the `compendium` tag
// (claude-docs/db/compendium-cache.md).
const cachedPage = cachedCompendiumRead('deity-page', findDeityPage);
const cachedCount = cachedCompendiumRead('deity-count', findDeityCount);
const list = cachedFilteredList(cachedPage, cachedCount, 'traditionId');

/** A deity's slug is its name and its tradition's, so a collision is cured by changing either. */
const DEITIES: CuratedVocabulary<typeof deities> = {
  table: deities,
  slugIndex: 'deities_slug_unique',
  noun: 'deity',
  addressHint: ' or tradition',
};

/**
 * One page of the curated deities under `filter`, each under its tradition,
 * for the admin page's list: a public read (MB.80), so no session, and the
 * finder decides what counts as curated — a live deity under a live
 * tradition. A blank query is no query, and a tradition id that is not a uuid
 * names no tradition, so lists nothing, as `listIngredientFormValues` reads
 * its filter.
 */
export function listDeities(
  filter: DeityFilter,
  page: PageRequest,
): Promise<PageEntry<DeityRow>[]> {
  return list.list(filter, page);
}

/**
 * How many deities `listDeities` pages under `filter`, and how many come
 * before `start` — a page's first row, none on an empty page: "Page X of Y".
 */
export function countDeities(filter: DeityFilter, start: Cursor | undefined): Promise<PageCount> {
  return list.count(filter, start);
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

  const written = await withAudit(session, async (write) => {
    const [row] = await write.insert(deities, { ...fields, slug });
    return row;
  }).catch((error: unknown) => refuseSlugCollision(DEITIES, error, slug));
  expireCompendium();
  return written;
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
  const current = await liveRow(DEITIES, id);
  const slug = deitySlug(fields.name, traditionName);

  const written = await withAudit(session, async (write) => {
    const [row] = await write.updateById(deities, id, { ...fields, slug });
    if (!row) throw new NotFound('No such deity');
    if (current.name !== fields.name) await write.carryDeityRename(admin, id, fields.name);
    return row;
  }).catch((error: unknown) => refuseSlugCollision(DEITIES, error, slug));
  expireCompendium();
  return written;
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
  const deity = await liveRow(DEITIES, id);
  // Read through the compendium's own filter on the pick, which the
  // `ingredient_deities_deity_id_idx` index answers.
  await refuseWhileHeld(
    { deityId: deity.id },
    {
      name: deity.name,
      holding: 'is among the deities of',
      remedy: (count) => `Take it off ${plural(count, 'its', 'their')} deities first.`,
    },
  );

  await withAudit(session, async (write) => {
    const [row] = await write.softDeleteByIds(deities, [id]);
    if (!row) throw new NotFound('No such deity');
  });
  expireCompendium();
}

/**
 * The input parsed, its tradition checked live — a foreign key admits a
 * retired one — and the tradition's name, which the slug carries.
 */
async function parseDeity(
  input: DeityInput,
): Promise<{ fields: DeityInput; traditionName: string }> {
  const { fields, parent } = await parseUnderLiveParent(DeityInput, input, {
    table: deityTraditions,
    column: 'traditionId',
    refusal: 'Choose a tradition',
  });
  return { fields, traditionName: parent.name };
}

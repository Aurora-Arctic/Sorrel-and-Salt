import 'server-only';
import {
  findDeityCount,
  findDeityOtherNameHolders,
  findDeityOtherNames,
  findDeityPage,
  findManyByIds,
  withAudit,
} from '../../../db/repository';
import type { AuditWriter } from '../../../db/repository';
import { cachedCompendiumRead, expireCompendium } from '../../../lib/compendium-cache';
import { NotFound, ValidationError } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { deitySlug } from '../../../lib/slugify';
import { plural } from '../../../lib/text';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/types';
import { assertCurator } from '@/modules/identity';
import { deities, deityTraditions } from '../schema/deities';
import { deityOtherNames } from '../schema/deity-other-names';
import { DeityInput, otherNameHeldBy, otherNameRepeats } from '../validation/deity';
import { cachedFilteredList } from './curated-lists';
import {
  bySlug,
  createCurated,
  deleteCurated,
  liveRow,
  parseUnderLiveParent,
  refuseSlugCollision,
} from './curated-writes';
import type { CuratedVocabulary, DeityFilter, DeityRow } from '../types';

// A live link holds a deity, and a rename reaches the link (claude-docs/db/deity-vocabulary.md, "Deity service details").

// The list and its count, held in the data cache under the `compendium` tag (claude-docs/db/compendium-cache.md).
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

export function listDeities(
  filter: DeityFilter,
  page: PageRequest,
): Promise<PageEntry<DeityRow>[]> {
  return list.list(filter, page);
}

export function countDeities(filter: DeityFilter, start: Cursor | undefined): Promise<PageCount> {
  return list.count(filter, start);
}

/**
 * @throws {NotFound} no live deity holds the slug.
 */
export async function getDeityBySlug(slug: string): Promise<DeityRow> {
  return bySlug(DEITIES, slug);
}

/**
 * @throws {Forbidden} the caller is neither a curator nor a keeper.
 * @throws {ValidationError} the input breaks `DeityInput`, names no live tradition, or its slug is a live deity's.
 */
export async function createDeity(session: Session, input: DeityInput): Promise<DeityRow> {
  assertCurator(session);
  const { fields, traditionName, otherNames } = await parseDeity(input);
  const slug = deitySlug(fields.name, traditionName);

  return createCurated(session, DEITIES, fields, slug, (write, row) =>
    replaceOtherNames(write, row.id, otherNames),
  );
}

/**
 * Rewrites a deity whole, its slug following the name and the tradition, and carries a rename onto every live compendium
 * entry's link to it (claude-docs/db/deity-vocabulary.md, "Deity service details"). Its `seedKey` is left as it was.
 *
 * @throws {Forbidden} the caller is neither a curator nor a keeper.
 * @throws {ValidationError} as `createDeity` throws it, the row's own slug excepted.
 * @throws {NotFound} no live deity has this id.
 */
export async function updateDeity(
  session: Session,
  id: string,
  input: DeityInput,
): Promise<DeityRow> {
  const curator = assertCurator(session);
  const { fields, traditionName, otherNames } = await parseDeity(input, id);
  const current = await liveRow(DEITIES, id);
  const slug = deitySlug(fields.name, traditionName);

  const written = await withAudit(session, async (write) => {
    const [row] = await write.updateById(deities, id, { ...fields, slug });
    if (!row) throw new NotFound('No such deity');
    if (current.name !== fields.name) await write.carryDeityRename(curator, id, fields.name);
    await replaceOtherNames(write, id, otherNames);
    return row;
  }).catch((error: unknown) => refuseSlugCollision(DEITIES, error, slug));
  expireCompendium();
  return written;
}

/**
 * Soft-deletes a deity no live compendium entry links (claude-docs/db/deity-vocabulary.md, "Deity service details").
 *
 * @throws {Forbidden} the caller is neither a curator nor a keeper, or a live entry links the deity.
 * @throws {NotFound} no live deity has this id.
 */
export async function deleteDeity(session: Session, id: string): Promise<void> {
  assertCurator(session);
  // Read through the compendium's own filter on the pick, which `ingredient_deities_deity_id_idx` answers.
  await deleteCurated(session, DEITIES, id, (deity) => ({
    filter: { deityIds: [deity.id] },
    wording: {
      name: deity.name,
      holding: 'is among the deities of',
      remedy: (count) => `Take it off ${plural(count, 'its', 'their')} deities first.`,
    },
  }));
}

/** Each deity's live other names, alphabetically, in the order of `ids`: an empty list for a deity with none. Public, so no session. */
export async function deityOtherNamesOf(ids: readonly string[]): Promise<string[][]> {
  const rows = await findDeityOtherNames(ids);
  return ids.map((id) =>
    rows
      .filter((row) => row.deityId === id)
      .map((row) => row.name)
      .sort((a, b) => a.localeCompare(b)),
  );
}

/**
 * The input parsed, its tradition checked live and its name taken for the slug, and its other names refused when repeated or held
 * by another live deity (claude-docs/db/deity-vocabulary.md, "Deity service details"). `id` is the deity being rewritten.
 */
async function parseDeity(
  input: DeityInput,
  id?: string,
): Promise<{
  fields: Omit<DeityInput, 'otherNames'>;
  traditionName: string;
  otherNames: string[];
}> {
  const { fields, parent } = await parseUnderLiveParent(DeityInput, input, {
    table: deityTraditions,
    column: 'traditionId',
    refusal: 'Choose a tradition',
  });
  const { otherNames: sent, ...deity } = fields;
  const listed = sent ?? [];

  const issues = otherNameRepeats(listed).map((index) => ({
    path: ['otherNames', index],
    message: otherNameHeldBy(deity.name),
  }));
  const held = await findDeityOtherNameHolders(
    deity.traditionId,
    listed.filter((name) => name !== '').map((name) => name.toLowerCase()),
    id,
  );
  if (held.length > 0) {
    const holders = new Map(
      (await findManyByIds(deities, [...new Set(held.map((row) => row.deityId))])).map((row) => [
        row.id,
        row.name,
      ]),
    );
    const holderOf = new Map(held.map((row) => [row.name.toLowerCase(), row.deityId]));
    listed.forEach((name, index) => {
      const holder = holderOf.get(name.toLowerCase());
      if (name === '' || holder === undefined) return;
      if (issues.some((issue) => issue.path[1] === index)) return;
      issues.push({
        path: ['otherNames', index],
        message: otherNameHeldBy(holders.get(holder) ?? ''),
      });
    });
  }
  if (issues.length > 0) {
    throw new ValidationError(issues.sort((a, b) => Number(a.path[1]) - Number(b.path[1])));
  }

  return {
    fields: deity,
    traditionName: parent.name,
    otherNames: listed.filter((name) => name !== ''),
  };
}

/** Brings a deity's live other names to `names`, compared as written (claude-docs/db/deity-vocabulary.md, "Deity service details"). */
async function replaceOtherNames(
  write: AuditWriter,
  deityId: string,
  names: readonly string[],
): Promise<void> {
  const current = await findDeityOtherNames([deityId]);
  const wanted = new Set(names);
  const dropped = current.filter((row) => !wanted.has(row.name)).map((row) => row.id);
  if (dropped.length > 0) await write.softDeleteByIds(deityOtherNames, dropped);
  const kept = new Set(current.map((row) => row.name));
  for (const name of wanted) {
    if (!kept.has(name)) await write.insert(deityOtherNames, { deityId, name });
  }
}

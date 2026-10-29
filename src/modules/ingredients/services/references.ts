import 'server-only';
import {
  type CompendiumScore,
  type ReferenceRow,
  findManyReferences,
  findReferenceSuggestions,
  withAudit,
} from '../../../db/repository';
import { expireCompendium } from '../../../lib/compendium-cache';
import { NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { RowId, parseInput } from '../../../lib/validation';
import { references } from '../schema/references';
import { CompendiumFilter } from '../validation/compendium-filter';
import { ReferenceInput } from '../validation/reference';
import { type Membership, assertMembership, readersOf } from '@/modules/coven';
import { type Curator, assertCurator } from '@/modules/identity';
import type { PageEntry, PageRequest } from '../../../lib/types';
import type { ReferenceValues } from '../types';

// A reference, kept once in its tier and linked from every row it supports (claude-docs/db/references.md, "Reference service details").

/** Every optional field cleared, under the parsed input: Zod leaves an absent key absent, and an update replaces the row. */
const NOTHING = {
  authors: null,
  container: null,
  contributors: null,
  edition: null,
  volume: null,
  issue: null,
  series: null,
  place: null,
  publisher: null,
  published: null,
  pages: null,
  host: null,
  url: null,
  modified: null,
  accessed: null,
  note: null,
};

/**
 * Creates a reference in the compendium (`workspaceId` null) or in this coven.
 *
 * @throws {Forbidden} a compendium reference and the caller is not a site admin, or a coven's and the caller may not write its ingredients.
 * @throws {ValidationError} the input breaks `ReferenceInput`, pathed to the field.
 */
export async function createReference(
  session: Session,
  workspaceId: string | null | undefined,
  input: ReferenceValues,
): Promise<ReferenceRow> {
  if (workspaceId == null) {
    const curator = assertCurator(session);
    const values = parseInput(ReferenceInput, input);
    const written = await withAudit(session, async (write) => {
      const [row] = await write.insertInCompendium(curator, references, values);
      return row;
    });
    expireCompendium();
    return written;
  }

  const membership = await assertMembership(session, workspaceId, { ingredient: ['create'] });
  const values = parseInput(ReferenceInput, input);
  return withAudit(session, async (write) => {
    const [row] = await write.insertInWorkspace(membership, references, values);
    return row;
  });
}

/**
 * Replaces a reference with `input`, every field as the form submits it, so one left out is cleared; the edit reaches every row citing it.
 *
 * @throws {Forbidden} as `createReference`.
 * @throws {ValidationError} as `createReference`.
 * @throws {NotFound} no live reference with this id in that tier.
 */
export async function updateReference(
  session: Session,
  workspaceId: string | null | undefined,
  id: string,
  input: ReferenceValues,
): Promise<ReferenceRow> {
  const proof: { curator: Curator } | { membership: Membership } =
    workspaceId == null
      ? { curator: assertCurator(session) }
      : { membership: await assertMembership(session, workspaceId, { ingredient: ['update'] }) };
  const values = { ...NOTHING, ...parseInput(ReferenceInput, input) };
  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  if (!RowId.safeParse(id).success) throw new NotFound('No such source');

  const written = await withAudit(session, async (write) => {
    const [row] =
      'curator' in proof
        ? await write.updateByIdInCompendium(proof.curator, references, id, values)
        : await write.updateByIdInWorkspace(proof.membership, references, id, values);
    if (!row) throw new NotFound('No such source');
    return row;
  });
  // A coven's reference is in no cached read.
  if ('curator' in proof) expireCompendium();
  return written;
}

/**
 * One reference by id, whole, for the form that edits it, from the tiers the picker offers (claude-docs/db/references.md, "Reference service details").
 *
 * @throws {Forbidden} a coven is named and the caller may not read its ingredients.
 * @throws {NotFound} no live reference with this id in those tiers.
 */
export async function getReference(
  session: Session,
  workspaceId: string | null | undefined,
  id: string,
): Promise<ReferenceRow> {
  const memberships = await readersOf(session, workspaceId, { ingredient: ['read'] });
  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  if (!RowId.safeParse(id).success) throw new NotFound('No such source');
  const [row] = await findManyReferences(memberships, [id]);
  if (!row) throw new NotFound('No such source');
  return row;
}

/**
 * What the reference picker offers as `query` is typed (claude-docs/db/references.md, "Reference service details"). Asks only
 * `ingredient: ['read']`, so every row it returns is one a reader of this coven could already see cited.
 *
 * @throws {Forbidden} a coven is named and the caller may not read its ingredients.
 */
export async function suggestReferences(
  session: Session,
  workspaceId: string | null | undefined,
  query: string,
  page: PageRequest,
): Promise<PageEntry<ReferenceRow, CompendiumScore>[]> {
  const memberships = await readersOf(session, workspaceId, { ingredient: ['read'] });
  const filter = parseInput(CompendiumFilter, { query });
  return findReferenceSuggestions(memberships, filter.query ?? '', page);
}

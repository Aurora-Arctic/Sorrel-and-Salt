import 'server-only';
import {
  type CompendiumScore,
  type ReferenceRow,
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
import { type Membership, assertMembership } from '@/modules/coven';
import { type SiteAdmin, assertSiteAdmin } from '@/modules/identity';
import type { PageEntry, PageRequest } from '../../../lib/types';
import type { ReferenceValues } from '../types';

// A reference, kept once in its tier and linked from every row it supports
// (MB.151; claude-docs/db/references.md). Two tiers, as ingredients are: a
// null `workspaceId` is the compendium's, written under the `SiteAdmin` proof
// alone, and a coven's is written under its `Membership`, whoever links it —
// so a member who cites a compendium reference reads it and cannot change it.
// Nothing deletes one in v1. Revalidating the `compendium` tag on a
// compendium-tier write is M8.7's, with every other admin mutation.

/**
 * Every optional field cleared, under the parsed input: Zod leaves an absent
 * key absent, and an update replaces the row rather than merging into it.
 */
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
 * @throws {Forbidden} a compendium reference and the caller is not a site
 * admin, or a coven's and the caller may not write its ingredients — checked
 * before the input is read.
 * @throws {ValidationError} the input breaks `ReferenceInput`, pathed to the
 * field.
 */
export async function createReference(
  session: Session,
  workspaceId: string | null | undefined,
  input: ReferenceValues,
): Promise<ReferenceRow> {
  if (workspaceId == null) {
    const admin = assertSiteAdmin(session);
    const values = parseInput(ReferenceInput, input);
    const written = await withAudit(session, async (write) => {
      const [row] = await write.insertInCompendium(admin, references, values);
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
 * Replaces a reference with `input` — every field as the form submits it, so
 * one left out is cleared — in the compendium (`workspaceId` null) or in this
 * coven. The edit reaches every row citing it, which is the point of keeping
 * a source once.
 *
 * @throws {Forbidden} as `createReference`.
 * @throws {ValidationError} as `createReference`.
 * @throws {NotFound} no live reference with this id in that tier — a
 * compendium reference asked for under a coven, another coven's, and an id
 * that is not one included.
 */
export async function updateReference(
  session: Session,
  workspaceId: string | null | undefined,
  id: string,
  input: ReferenceValues,
): Promise<ReferenceRow> {
  const proof: { admin: SiteAdmin } | { membership: Membership } =
    workspaceId == null
      ? { admin: assertSiteAdmin(session) }
      : { membership: await assertMembership(session, workspaceId, { ingredient: ['update'] }) };
  const values = { ...NOTHING, ...parseInput(ReferenceInput, input) };
  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  if (!RowId.safeParse(id).success) throw new NotFound('No such source');

  const written = await withAudit(session, async (write) => {
    const [row] =
      'admin' in proof
        ? await write.updateByIdInCompendium(proof.admin, references, id, values)
        : await write.updateByIdInWorkspace(proof.membership, references, id, values);
    if (!row) throw new NotFound('No such source');
    return row;
  });
  // A coven's reference is in no cached read.
  if ('admin' in proof) expireCompendium();
  return written;
}

/**
 * What the reference picker offers as `query` is typed: the references an
 * ingredient in this coven may cite — the compendium's and its own, never
 * another coven's — matched on authors, title and container, best match
 * first. A blank query, or one under the compendium search's
 * `MIN_QUERY_LENGTH`, offers all by title. Without a coven, the compendium's
 * alone, which is all a compendium entry may cite (M5.5).
 *
 * Asks only `ingredient: ['read']`: every row it can return is one a reader of
 * this coven could already see cited.
 *
 * @throws {Forbidden} a coven is named and the caller may not read its
 * ingredients.
 */
export async function suggestReferences(
  session: Session,
  workspaceId: string | null | undefined,
  query: string,
  page: PageRequest,
): Promise<PageEntry<ReferenceRow, CompendiumScore>[]> {
  const memberships: Membership[] = [];
  if (workspaceId != null) {
    memberships.push(await assertMembership(session, workspaceId, { ingredient: ['read'] }));
  }
  const filter = parseInput(CompendiumFilter, { query });
  return findReferenceSuggestions(memberships, filter.query ?? '', page);
}

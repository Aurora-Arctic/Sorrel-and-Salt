import 'server-only';
import {
  type CompendiumScore,
  findCompendiumCount,
  findCompendiumPage,
  findOneIngredient,
} from '../../../db/repository';
import { Forbidden, NotFound } from '../../../lib/errors';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../../lib/pagination';
import type { Session } from '../../../lib/session';
import { RowId, parseInput } from '../../../lib/validation';
import type { ingredients } from '../schema/ingredients';
import { CompendiumFilter, type CompendiumFilterInput } from '../validation/compendium-filter';
import { type Membership, assertMembership } from '@/modules/coven';

// The compendium's reads: the public surface (MB.80), so the list takes no
// session at all and an entry answers anyone. Writes are M5.2's
// (claude-docs/db.md, "The compendium read").

export type IngredientRow = typeof ingredients.$inferSelect;

/**
 * One page of the compendium under `filter`, best match first on a search,
 * each entry carrying its score. Parsed here because the browser is not the
 * only caller, and because a category id reaches a `uuid` comparison inside
 * the keyset query, whose one client text was the cursor: unchecked, a
 * malformed id would come back as "Invalid cursor". A query shorter than
 * `MIN_QUERY_LENGTH` is no search.
 *
 * @throws {ValidationError} a category id is not a uuid.
 */
export async function listCompendium(
  filter: CompendiumFilterInput,
  page: PageRequest,
): Promise<PageEntry<IngredientRow, CompendiumScore>[]> {
  return findCompendiumPage(parseInput(CompendiumFilter, filter), page);
}

/**
 * How many entries the compendium holds under `filter`, and how many come
 * before `start` — a page's first row, none on an empty page. Parsed as
 * `listCompendium` parses, so it counts the rows that list's pages hold.
 *
 * @throws {ValidationError} a category id is not a uuid.
 */
export async function countCompendium(
  filter: CompendiumFilterInput,
  start: Cursor | undefined,
): Promise<PageCount> {
  return findCompendiumCount(parseInput(CompendiumFilter, filter), start);
}

/**
 * One ingredient by id: a compendium entry for anyone, signed out included,
 * and — with `workspaceId` — that coven's own entry for its members, viewers
 * included. Without a coven the read is the compendium alone, so a coven's
 * row answers `NotFound` to whoever asks: its existence is private.
 *
 * @throws {Forbidden} a coven is named and the caller is not in it, a site
 * admin and a signed-out caller included.
 * @throws {NotFound} no such entry where the caller may look.
 */
export async function getIngredient(
  session: Session | null,
  id: string,
  workspaceId?: string | null,
): Promise<IngredientRow> {
  const memberships: Membership[] = [];
  if (workspaceId != null) {
    if (!session) throw new Forbidden();
    memberships.push(await assertMembership(session, workspaceId, { ingredient: ['read'] }));
  }

  // An id that is not a uuid names nothing, and would be a driver error at the comparison.
  const row = RowId.safeParse(id).success ? await findOneIngredient(memberships, id) : undefined;
  if (!row) throw new NotFound('No such ingredient');
  return row;
}

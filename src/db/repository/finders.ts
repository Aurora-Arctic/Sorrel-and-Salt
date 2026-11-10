import { and, eq, inArray, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { Membership } from '@/modules/coven';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import { spells } from '../../modules/grimoire/schema/spells';
import { notSoftDeleted, readableInTiers, scopedTo } from './predicates';
import { existsIn, pageBounds, selectFrom } from './select';
import { readableSpells } from './spells';
import type {
  Identified,
  Keyset,
  NotIngredientScoped,
  NotSpellScoped,
  NotVisibilityScoped,
  PageOrder,
  Slugged,
  SortPart,
  SpellScoped,
  Unscoped,
  WorkspaceScoped,
  ReadRow,
} from './types';

export function findMany<TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped>(
  table: TTable,
  where?: SQL,
): Promise<ReadRow<TTable>[]> {
  // `and` drops undefined conditions, so a join table's read is the caller's
  // `where` alone.
  return selectFrom(table, and(notSoftDeleted(table), where));
}

export async function findOne<
  TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped,
>(table: TTable, where?: SQL): Promise<ReadRow<TTable> | undefined> {
  const [row] = await findMany(table, where);
  return row;
}

export function findOneById<
  TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped & Identified,
>(table: TTable, id: string): Promise<ReadRow<TTable> | undefined> {
  return findOne(table, eq(table.id, id));
}

export function findOneBySlug<
  TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped & Slugged,
>(table: TTable, slug: string): Promise<ReadRow<TTable> | undefined> {
  return findOne(table, eq(table.slug, slug));
}

/** The live rows among these ids, in no particular order. */
export async function findManyByIds<
  TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped & Identified,
>(table: TTable, ids: readonly string[]): Promise<ReadRow<TTable>[]> {
  if (ids.length === 0) return [];
  return findMany(table, inArray(table.id, [...ids]));
}

export function findManyInWorkspace<TTable extends PgTable & WorkspaceScoped & NotVisibilityScoped>(
  membership: Membership,
  table: TTable,
  where?: SQL,
): Promise<ReadRow<TTable>[]> {
  return selectFrom(table, and(scopedTo(membership, table), notSoftDeleted(table), where));
}

/** The first such row, or `undefined` — including when it belongs to another workspace. */
export async function findOneInWorkspace<
  TTable extends PgTable & WorkspaceScoped & NotVisibilityScoped,
>(membership: Membership, table: TTable, where?: SQL): Promise<ReadRow<TTable> | undefined> {
  const [row] = await findManyInWorkspace(membership, table, where);
  return row;
}

/** The live row with this id in the proof's workspace; another workspace's id answers
 * `undefined`. */
export function findOneByIdInWorkspace<
  TTable extends PgTable & WorkspaceScoped & NotVisibilityScoped & Identified,
>(membership: Membership, table: TTable, id: string): Promise<ReadRow<TTable> | undefined> {
  return findOneInWorkspace(membership, table, eq(table.id, id));
}

/** One page in `(...sort, id)` order; `page` comes from `resolvePage`
 * (src/lib/pagination.ts), already clamped. */
export function findPage<
  TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped & Identified,
  Carried extends object,
>(
  table: TTable,
  order: PageOrder<Carried>,
  page: PageRequest,
  where?: SQL,
): Promise<PageEntry<ReadRow<TTable>, Carried>[]> {
  return readPage(table, notSoftDeleted(table), order, page, where);
}

export function findPageCount<
  TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped & Identified,
>(table: TTable, order: PageOrder, start: Cursor | undefined, where?: SQL): Promise<PageCount> {
  return readCount(table, notSoftDeleted(table), order, start, where);
}

export function findPageInWorkspace<
  TTable extends PgTable & WorkspaceScoped & NotVisibilityScoped & Identified,
  Carried extends object,
>(
  membership: Membership,
  table: TTable,
  order: PageOrder<Carried>,
  page: PageRequest,
  where?: SQL,
): Promise<PageEntry<ReadRow<TTable>, Carried>[]> {
  return readPage(
    table,
    and(scopedTo(membership, table), notSoftDeleted(table)),
    order,
    page,
    where,
  );
}

/**
 * The same across the tiers `memberships` may read; no proofs pages the compendium alone. Inside the folder only: a
 * two-tier list is the repository's to build, so its finders call this and a service calls them.
 */
export function findPageInTiers<
  TTable extends PgTable & WorkspaceScoped & NotVisibilityScoped & Identified,
  Carried extends object,
>(
  memberships: readonly Membership[],
  table: TTable,
  order: PageOrder<Carried>,
  page: PageRequest,
  where?: SQL,
): Promise<PageEntry<ReadRow<TTable>, Carried>[]> {
  return readPage(table, readableInTiers(memberships, table), order, page, where);
}

export function findPageCountInTiers<
  TTable extends PgTable & WorkspaceScoped & NotVisibilityScoped & Identified,
>(
  memberships: readonly Membership[],
  table: TTable,
  order: PageOrder,
  start: Cursor | undefined,
  where?: SQL,
): Promise<PageCount> {
  return readCount(table, readableInTiers(memberships, table), order, start, where);
}

/**
 * The same for `spells` or a table hung off one by `spell_id`: only rows of spells this member may read, under
 * `readableSpells`, ANDed here so a private spell never reaches a page (CLAUDE.md rule 7). A child table has no
 * `workspace_id`, so its coven and visibility come from the parent through a correlated `EXISTS`.
 */
export function findPageInReadableSpells<
  TTable extends PgTable &
    Identified &
    (typeof spells | (SpellScoped & Unscoped & NotVisibilityScoped)),
  Carried extends object,
>(
  membership: Membership,
  table: TTable,
  order: PageOrder<Carried>,
  page: PageRequest,
  where?: SQL,
): Promise<PageEntry<ReadRow<TTable>, Carried>[]> {
  return readPage(
    table,
    and(readableSpellRows(membership, table), notSoftDeleted(table)),
    order,
    page,
    where,
  );
}

/** Counted under the same `readableSpells` rule, so a private spell never reaches another
 * member's count. */
export function findPageCountInReadableSpells<
  TTable extends PgTable &
    Identified &
    (typeof spells | (SpellScoped & Unscoped & NotVisibilityScoped)),
>(
  membership: Membership,
  table: TTable,
  order: PageOrder,
  start: Cursor | undefined,
  where?: SQL,
): Promise<PageCount> {
  return readCount(
    table,
    and(readableSpellRows(membership, table), notSoftDeleted(table)),
    order,
    start,
    where,
  );
}

/** `readableSpells` for `spells` itself, or through the parent spell for a `spell_id` table. */
function readableSpellRows(
  membership: Membership,
  table: typeof spells | SpellScoped,
): SQL | undefined {
  if (table === spells) return readableSpells(membership);
  const child = table as SpellScoped;
  return existsIn(spells, and(eq(spells.id, child.spellId), readableSpells(membership)));
}

/**
 * A page of live rows under a scope the calling finder spells itself, for a table no pager above admits (`invitations`'
 * site tier: two-tier yet no compendium row). Inside the folder only; the tombstone filter is ANDed here.
 */
export function findPageInScope<TTable extends PgTable & Identified, Carried extends object>(
  table: TTable,
  scope: SQL,
  order: PageOrder<Carried>,
  page: PageRequest,
  where?: SQL,
): Promise<PageEntry<ReadRow<TTable>, Carried>[]> {
  return readPage(table, and(scope, notSoftDeleted(table)), order, page, where);
}

export function findPageCountInScope(
  table: PgTable & Identified,
  scope: SQL,
  order: PageOrder,
  start: Cursor | undefined,
  where?: SQL,
): Promise<PageCount> {
  return readCount(table, and(scope, notSoftDeleted(table)), order, start, where);
}

/**
 * `findPageInScope` without the tombstone filter: the scope decides which deleted rows it admits. Its one caller is the
 * coven's Ingredients list, which admits a retired compendium entry only while the cupboard names it. A hatch, not a flag;
 * `tests/guards/soft-delete-finder-guard.test.ts` pins its caller.
 */
export function findPageInScopeIncludingSoftDeleted<
  TTable extends PgTable & Identified,
  Carried extends object,
>(
  table: TTable,
  scope: SQL,
  order: PageOrder<Carried>,
  page: PageRequest,
  where?: SQL,
): Promise<PageEntry<ReadRow<TTable>, Carried>[]> {
  return readPage(table, scope, order, page, where);
}

export function findPageCountInScopeIncludingSoftDeleted(
  table: PgTable & Identified,
  scope: SQL,
  order: PageOrder,
  start: Cursor | undefined,
  where?: SQL,
): Promise<PageCount> {
  return readCount(table, scope, order, start, where);
}

function readPage<TTable extends PgTable & Identified, Carried extends object>(
  table: TTable,
  scope: SQL | undefined,
  order: PageOrder<Carried>,
  page: PageRequest,
  where: SQL | undefined,
): Promise<PageEntry<ReadRow<TTable>, Carried>[]> {
  const keyset: Keyset<Carried> = { ...keyOf(table, order), request: page };
  return selectFrom(table, and(scope, where, pageBounds(keyset)), keyset);
}

function readCount(
  table: PgTable & Identified,
  scope: SQL | undefined,
  order: PageOrder,
  start: Cursor | undefined,
  where: SQL | undefined,
): Promise<PageCount> {
  return selectFrom(table, and(scope, where), { count: keyOf(table, order), start });
}

function keyOf<Carried extends object>(
  table: Identified,
  order: PageOrder<Carried>,
): Omit<Keyset<Carried>, 'request'> {
  return isSortAlone(order) ? { sort: order, id: table.id } : { ...order, id: table.id };
}

/** A sort alone, rather than a `ListOrder`. `Array.isArray` narrows no readonly array. */
function isSortAlone<Carried extends object>(
  order: PageOrder<Carried>,
): order is readonly SortPart[] {
  return Array.isArray(order);
}

/**
 * The escape hatch for admin restore paths only. Named rather than a flag that could default the wrong way; the two spell
 * hatches in `spells.ts` are the only other bypasses. Workspace-scoped tables are not reachable through it.
 */
export function findManyIncludingSoftDeleted<
  TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped,
>(table: TTable, where?: SQL): Promise<ReadRow<TTable>[]> {
  return selectFrom(table, where);
}

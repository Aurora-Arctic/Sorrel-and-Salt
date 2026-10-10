import { and, eq, inArray, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { Membership } from '@/modules/coven';
import type { Cursor, PageCount, PageEntry, PageRequest } from '../../lib/types';
import { notSoftDeleted, readableInTiers, scopedTo } from './predicates';
import { pageBounds, selectFrom } from './select';
import type {
  Identified,
  Keyset,
  NotIngredientScoped,
  NotSpellScoped,
  NotVisibilityScoped,
  PageOrder,
  Slugged,
  SortPart,
  Unscoped,
  WorkspaceScoped,
} from './types';

/** All matching, non-soft-deleted rows. The default and normal-use finder. */
export function findMany<TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped>(
  table: TTable,
  where?: SQL,
): Promise<TTable['$inferSelect'][]> {
  // `and` drops undefined conditions, so a join table's read is the caller's
  // `where` alone.
  return selectFrom(table, and(notSoftDeleted(table), where));
}

/** The first matching, non-soft-deleted row, or `undefined`. */
export async function findOne<
  TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped,
>(table: TTable, where?: SQL): Promise<TTable['$inferSelect'] | undefined> {
  const [row] = await findMany(table, where);
  return row;
}

/**
 * The live row with this id, or `undefined`. The read-side twin of
 * `write.updateById`: a service cannot build `eq(table.id, id)` itself (MB.33).
 */
export function findOneById<
  TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped & Identified,
>(table: TTable, id: string): Promise<TTable['$inferSelect'] | undefined> {
  return findOne(table, eq(table.id, id));
}

/**
 * The live row holding this slug, or `undefined` — the read an admin page
 * opens a row by, for a table no proof scopes. Every slug index is partial on
 * `deleted_at IS NULL`, so at most one live row answers.
 */
export function findOneBySlug<
  TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped & Slugged,
>(table: TTable, slug: string): Promise<TTable['$inferSelect'] | undefined> {
  return findOne(table, eq(table.slug, slug));
}

/** The live rows among these ids, in no particular order — a loader's batch read. */
export async function findManyByIds<
  TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped & Identified,
>(table: TTable, ids: readonly string[]): Promise<TTable['$inferSelect'][]> {
  if (ids.length === 0) return [];
  return findMany(table, inArray(table.id, [...ids]));
}

/** All matching, non-soft-deleted rows inside the workspace the proof names. */
export function findManyInWorkspace<TTable extends PgTable & WorkspaceScoped & NotVisibilityScoped>(
  membership: Membership,
  table: TTable,
  where?: SQL,
): Promise<TTable['$inferSelect'][]> {
  return selectFrom(table, and(scopedTo(membership, table), notSoftDeleted(table), where));
}

/** The first such row, or `undefined` — including when it belongs to another workspace. */
export async function findOneInWorkspace<
  TTable extends PgTable & WorkspaceScoped & NotVisibilityScoped,
>(membership: Membership, table: TTable, where?: SQL): Promise<TTable['$inferSelect'] | undefined> {
  const [row] = await findManyInWorkspace(membership, table, where);
  return row;
}

/**
 * The live row with this id in the proof's workspace, or `undefined` —
 * including when the id is another workspace's. The scoped twin of
 * `findOneById`, for the same reason: a service cannot build the `where`
 * `findOneInWorkspace` wants (MB.33).
 */
export function findOneByIdInWorkspace<
  TTable extends PgTable & WorkspaceScoped & NotVisibilityScoped & Identified,
>(membership: Membership, table: TTable, id: string): Promise<TTable['$inferSelect'] | undefined> {
  return findOneInWorkspace(membership, table, eq(table.id, id));
}

/**
 * One page of non-soft-deleted rows in `(...sort, id)` order, each part
 * ascending, each row with the cursor it was found at: CLAUDE.md rule 8's
 * keyset half. `order` is the sort, or a `ListOrder` with the join, the
 * threshold and the carried values reading it takes; the id is always the
 * table's. `page` comes from `resolvePage` in `src/lib/pagination.ts`,
 * already clamped to the maximum.
 */
export function findPage<
  TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped & Identified,
  Carried extends object,
>(
  table: TTable,
  order: PageOrder<Carried>,
  page: PageRequest,
  where?: SQL,
): Promise<PageEntry<TTable['$inferSelect'], Carried>[]> {
  return readPage(table, notSoftDeleted(table), order, page, where);
}

/**
 * How many live rows `findPage` pages under the same `order` and `where`, and
 * how many come before `start` — a page's first row, none on an empty page —
 * in its order: "Page X of Y" for a list read through it. One statement, over
 * the page's own key, join and threshold.
 */
export function findPageCount<
  TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped & Identified,
>(table: TTable, order: PageOrder, start: Cursor | undefined, where?: SQL): Promise<PageCount> {
  return readCount(table, notSoftDeleted(table), order, start, where);
}

/** The same, inside the workspace the proof names. */
export function findPageInWorkspace<
  TTable extends PgTable & WorkspaceScoped & NotVisibilityScoped & Identified,
  Carried extends object,
>(
  membership: Membership,
  table: TTable,
  order: PageOrder<Carried>,
  page: PageRequest,
  where?: SQL,
): Promise<PageEntry<TTable['$inferSelect'], Carried>[]> {
  return readPage(
    table,
    and(scopedTo(membership, table), notSoftDeleted(table)),
    order,
    page,
    where,
  );
}

/**
 * The same, across the tiers `memberships` may read: the compendium, and each
 * coven one of them proves. No proofs pages the compendium alone. Inside the
 * folder only: a two-tier list is the repository's to build, so its finders
 * call this and a service calls them.
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
): Promise<PageEntry<TTable['$inferSelect'], Carried>[]> {
  return readPage(table, readableInTiers(memberships, table), order, page, where);
}

/** `findPageCount` for `findPageInTiers`: the same rows, counted. */
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

/** A page of `table` under its finder's `scope` and the caller's `where`, cut at the page's bounds. */
function readPage<TTable extends PgTable & Identified, Carried extends object>(
  table: TTable,
  scope: SQL | undefined,
  order: PageOrder<Carried>,
  page: PageRequest,
  where: SQL | undefined,
): Promise<PageEntry<TTable['$inferSelect'], Carried>[]> {
  const keyset: Keyset<Carried> = { ...keyOf(table, order), request: page };
  return selectFrom(table, and(scope, where, pageBounds(keyset)), keyset);
}

/** The rows `readPage` pages under the same scope, `where` and order, counted. */
function readCount(
  table: PgTable & Identified,
  scope: SQL | undefined,
  order: PageOrder,
  start: Cursor | undefined,
  where: SQL | undefined,
): Promise<PageCount> {
  return selectFrom(table, and(scope, where), { count: keyOf(table, order), start });
}

/** `order` keyed on the table's own id, so a page and its count key alike. */
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
 * The escape hatch, for admin restore paths only. Named rather than a flag a
 * later edit could default the wrong way; any other bypass is named too, and
 * argued for in the diff — the two spell hatches in `spells.ts` are the only
 * others. Workspace-scoped tables are not reachable through it — v1 has no
 * restore UI, and the task that adds one adds its proof-scoped counterpart.
 */
export function findManyIncludingSoftDeleted<
  TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped,
>(table: TTable, where?: SQL): Promise<TTable['$inferSelect'][]> {
  return selectFrom(table, where);
}

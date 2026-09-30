import { and, eq, inArray, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { Membership } from '@/modules/coven';
import type { PageEntry, PageRequest } from '../../lib/types';
import { notSoftDeleted, scopedTo } from './predicates';
import { pageBounds, selectFrom } from './select';
import type {
  Identified,
  NotIngredientScoped,
  NotSpellScoped,
  NotVisibilityScoped,
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
export async function findOneById<
  TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped & Identified,
>(table: TTable, id: string): Promise<TTable['$inferSelect'] | undefined> {
  const [row] = await findMany(table, eq(table.id, id));
  return row;
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
export async function findOneByIdInWorkspace<
  TTable extends PgTable & WorkspaceScoped & NotVisibilityScoped & Identified,
>(membership: Membership, table: TTable, id: string): Promise<TTable['$inferSelect'] | undefined> {
  const [row] = await findManyInWorkspace(membership, table, eq(table.id, id));
  return row;
}

/**
 * One page of non-soft-deleted rows in `(...sort, id)` order, each part
 * ascending, each row with the cursor it was found at: CLAUDE.md rule 8's
 * keyset half. `page` comes from
 * `resolvePage` in `src/lib/pagination.ts`, already clamped to the maximum.
 */
export function findPage<
  TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped & Identified,
>(
  table: TTable,
  sort: readonly SortPart[],
  page: PageRequest,
  where?: SQL,
): Promise<PageEntry<TTable['$inferSelect']>[]> {
  const keyset = { sort, id: table.id, request: page };
  return selectFrom(table, and(notSoftDeleted(table), where, pageBounds(keyset)), keyset);
}

/** The same, inside the workspace the proof names. */
export function findPageInWorkspace<
  TTable extends PgTable & WorkspaceScoped & NotVisibilityScoped & Identified,
>(
  membership: Membership,
  table: TTable,
  sort: readonly SortPart[],
  page: PageRequest,
  where?: SQL,
): Promise<PageEntry<TTable['$inferSelect']>[]> {
  const keyset = { sort, id: table.id, request: page };
  return selectFrom(
    table,
    and(scopedTo(membership, table), notSoftDeleted(table), where, pageBounds(keyset)),
    keyset,
  );
}

/**
 * The escape hatch, for admin restore paths only. Named rather than a flag a
 * later edit could default the wrong way; a second bypass is argued for in
 * the diff. Workspace-scoped tables are not reachable through it — v1 has no
 * restore UI, and the task that adds one adds its proof-scoped counterpart.
 */
export function findManyIncludingSoftDeleted<
  TTable extends PgTable & Unscoped & NotSpellScoped & NotIngredientScoped,
>(table: TTable, where?: SQL): Promise<TTable['$inferSelect'][]> {
  return selectFrom(table, where);
}

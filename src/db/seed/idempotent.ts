import { getTableColumns, inArray, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgInsertValue, PgTable } from 'drizzle-orm/pg-core';
import { BOOTSTRAP_SESSION, insertBootstrapAdmin } from './bootstrap-admin';
import { applyAudit, publishActor } from '../audit';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import type { AuditSession } from '../types';
import type { FlatTable, GroupTable, ItemTable } from '../vocabularies';
import type { InsertStamps, SeedDatabase, SeedRunOptions, SeedTransaction } from './types';

// The moves every seed makes. Writes go through the handle the caller
// gives, not `withAudit` (claude-docs/design-decisions/m1.21-seed-writes-through-its-handle.md).

/** Thrown inside the transaction to roll a dry run back, and caught outside it. */
class DryRunRollback<T> extends Error {
  constructor(readonly result: T) {
    super('dry run');
  }
}

/**
 * The seed's transaction: the bootstrap user published as the actor, as `withAudit` publishes its session, before `body`
 * writes a row naming it as creator. On a dry run `body` runs in full and the transaction is rolled back, so every read and
 * constraint is real and nothing remains; a separate planning pass could drift from the run it previews.
 */
export async function beginSeedTransaction<T>(
  db: SeedDatabase,
  body: (tx: SeedTransaction) => Promise<T>,
  { dryRun = false }: SeedRunOptions = {},
): Promise<T> {
  try {
    return await db.transaction(async (tx) => {
      await publishActor(tx, { userId: BOOTSTRAP_USER_ID });
      await insertBootstrapAdmin(tx);
      const result = await body(tx);
      if (dryRun) throw new DryRunRollback(result);
      return result;
    });
  } catch (error) {
    if (error instanceof DryRunRollback) return error.result as T;
    throw error;
  }
}

/**
 * Runs `body` with the `bootstrap` privilege route declared and `actor` published, then hands the transaction back with no
 * route. The seed writes no ledger row: the `users` trigger records each privilege a seeded user is inserted holding and
 * refuses an undeclared one. Not a `finally`: a failed body aborted the transaction and would only bury its error.
 */
export async function declaringBootstrapPrivileges<T>(
  tx: SeedTransaction,
  actor: string,
  body: () => Promise<T>,
): Promise<T> {
  await publishActor(tx, { userId: actor, route: 'bootstrap' });
  const result = await body();
  await publishActor(tx, { userId: BOOTSTRAP_USER_ID });
  return result;
}

/**
 * Inserts every `wanted` whose key `existing` did not return, stamped by the bootstrap user, touching nothing present.
 * `existing` is the caller's own read, for a present that is not one key on both sides; a column key is `insertMissingBy`'s.
 */
export async function insertMissing<TTable extends PgTable, W, K>(
  tx: SeedTransaction,
  table: TTable,
  wanted: readonly W[],
  {
    existing,
    keyOf,
    toRow,
    session,
  }: {
    existing: (tx: SeedTransaction) => Promise<Iterable<K>>;
    keyOf: (item: W) => K;
    toRow: (item: W) => Omit<PgInsertValue<TTable>, InsertStamps>;
    /** Who the rows are stamped by: the bootstrap user unless a seeded row is a member's own. */
    session?: AuditSession;
  },
): Promise<void> {
  const present = new Set(await existing(tx));
  const missing = wanted.filter((item) => !present.has(keyOf(item)));

  await insertStamped(tx, table, missing.map(toRow), session);
}

/** Rows per INSERT: a statement binds at most 65,535 parameters, and a row binds one per column. */
export const INSERT_CHUNK = 1000;

/**
 * Inserts `rows`, stamped by the bootstrap user or `session`, `INSERT_CHUNK` to a statement to stay under Postgres's
 * parameter limit, and returns them in order. Presence is the caller's to check.
 */
export async function insertStamped<TTable extends PgTable>(
  tx: SeedTransaction,
  table: TTable,
  rows: readonly Omit<PgInsertValue<TTable>, InsertStamps>[],
  session: AuditSession = BOOTSTRAP_SESSION,
): Promise<TTable['$inferSelect'][]> {
  const inserted: TTable['$inferSelect'][] = [];
  for (let start = 0; start < rows.length; start += INSERT_CHUNK) {
    const chunk = rows.slice(start, start + INSERT_CHUNK).map(
      // `Omit` of a generic loses the row's type for TS; `applyAudit` puts
      // back exactly the four stamps `InsertStamps` took out.
      (row) => applyAudit('insert', row, session) as PgInsertValue<TTable>,
    );
    inserted.push(
      ...((await tx.insert(table).values(chunk).returning()) as TTable['$inferSelect'][]),
    );
  }
  return inserted;
}

/**
 * `insertMissing` keyed on `columns`, built once from the table's rows and each `wanted`. A part compares as written, or
 * through `fold` where the unique index folds it; null and absent are one empty part. A one-column key reads only the
 * wanted values, a wider one the table (narrowed by `where`). `deleted_at` is ignored unless `where` reads it, so a retired row stays.
 */
export async function insertMissingBy<
  TTable extends PgTable,
  K extends keyof TTable['$inferSelect'] & string,
  W extends { [Column in K]?: unknown },
>(
  tx: SeedTransaction,
  table: TTable,
  wanted: readonly W[],
  {
    columns,
    fold = {},
    where,
    toRow,
    session,
  }: {
    columns: readonly K[];
    fold?: { [Column in K]?: (value: string) => string };
    where?: SQL;
    toRow: (item: W) => Omit<PgInsertValue<TTable>, InsertStamps>;
    session?: AuditSession;
  },
): Promise<void> {
  const tableColumns: Record<string, AnyPgColumn> = getTableColumns(table);
  const keyOf = (row: { [Column in K]?: unknown }) =>
    columns
      .map((column) => {
        const value = row[column];
        if (value === null || value === undefined) return '';
        return fold[column]?.(String(value)) ?? String(value);
      })
      .join('|');
  const [only] = columns;
  const scope =
    columns.length === 1
      ? inArray(
          tableColumns[only],
          wanted.map((item) => item[only]),
        )
      : where;

  await insertMissing(tx, table, wanted, {
    existing: async (tx) => {
      if (wanted.length === 0) return [];
      // The cast `selectFrom` makes: `.from()` is typed against one table, not a generic.
      const rows: { [Column in K]?: unknown }[] = await tx
        .select(Object.fromEntries(columns.map((column) => [column, tableColumns[column]])))
        .from(table as never)
        .where(scope);
      return rows.map(keyOf);
    },
    keyOf,
    toRow,
    session,
  });
}

/**
 * Inserts each `wanted` whose key `present` lacks and returns `present` with each inserted id under its key: `insertMissing`
 * for callers that link the rows they insert. `present` is the caller's read, since each decides what present means;
 * `keyOfRow` reads the key back off an inserted row.
 */
export async function insertMissingReturningIds<
  TTable extends PgTable,
  W,
  M extends Map<string, string | null>,
>(
  tx: SeedTransaction,
  table: TTable,
  wanted: readonly W[],
  present: M,
  {
    keyOf,
    keyOfRow,
    toRow,
  }: {
    keyOf: (item: W) => string;
    keyOfRow: (row: TTable['$inferSelect']) => string;
    toRow: (item: W) => Omit<PgInsertValue<TTable>, InsertStamps>;
  },
): Promise<M> {
  const missing = wanted.filter((item) => !present.has(keyOf(item)));
  if (missing.length === 0) return present;

  const inserted = (await insertStamped(
    tx,
    table,
    missing.map(toRow),
  )) as (TTable['$inferSelect'] & {
    id: string;
  })[];

  for (const row of inserted) present.set(keyOfRow(row), row.id);
  return present;
}

/**
 * `map.get(key)`, or the error `describe` writes. Every seed lookup is
 * unreachable while the literals agree with each other, and a silent
 * `undefined` would fail NOT NULL several rows later, naming the wrong row.
 */
export function requireFrom<K, V>(map: Map<K, V>, key: K, describe: () => string): V {
  const value = map.get(key);

  if (value === undefined) throw new Error(describe());

  return value;
}

/**
 * What a vocabulary seed takes as present: every row's `seed_key`, live or soft-deleted (a renamed or retired seed row stays
 * its own), and every live row's slug (an admin's row under a seed name is not met by a second the slug index refuses).
 * Typed on the union, which Drizzle's `from()` accepts where it cannot narrow a generic.
 */
export async function presentKeys(
  tx: SeedTransaction,
  table: FlatTable | GroupTable | ItemTable,
): Promise<string[]> {
  const rows = await tx
    .select({ slug: table.slug, seedKey: table.seedKey, deletedAt: table.deletedAt })
    .from(table);

  return rows.flatMap(({ slug, seedKey, deletedAt }) => [
    ...(seedKey === null ? [] : [seedKey]),
    ...(deletedAt === null ? [slug] : []),
  ]);
}

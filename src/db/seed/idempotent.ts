import { getTableColumns, inArray, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgInsertValue, PgTable } from 'drizzle-orm/pg-core';
import { BOOTSTRAP_SESSION, insertBootstrapAdmin } from './bootstrap-admin';
import { applyAudit, publishActor } from '../audit';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import type { FlatTable, GroupTable, ItemTable } from '../vocabularies';
import type { InsertStamps, SeedDatabase, SeedTransaction } from './types';

// The three moves every seed makes. Writes go through the handle the caller
// gives, not `withAudit` (claude-docs/design-decisions/m1.21-seed-writes-through-its-handle.md).

/**
 * The seed's transaction: the bootstrap user published as the actor by
 * `publishActor`, as `withAudit` publishes its session — all four settings,
 * transaction-local — and present before `body` writes a row that names it as
 * creator.
 */
export async function beginSeedTransaction<T>(
  db: SeedDatabase,
  body: (tx: SeedTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await publishActor(tx, { userId: BOOTSTRAP_USER_ID });
    await insertBootstrapAdmin(tx);
    return body(tx);
  });
}

/**
 * Runs `body` with the privilege route `bootstrap` declared and `actor`
 * published as the acting user, then hands the transaction back to the
 * bootstrap user with no route. The seed writes no ledger row itself: the
 * trigger on `users` records each privilege a seeded user is inserted holding,
 * and refuses one inserted undeclared, stamping the row as the published
 * actor (MB.195). Not a `finally`: a failed body has aborted the
 * transaction, and a further statement would only bury its error.
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
 * Inserts every `wanted` whose key `existing` did not return, stamped by the
 * bootstrap user, and touches nothing already present. `existing` is the
 * caller's own query: each site scopes it (by id list, by tier, by workspace)
 * and decides for itself whether `deleted_at` is ignored — which it is,
 * everywhere, so a retired row is not resurrected on the next run.
 */
export async function insertMissing<TTable extends PgTable, W, K>(
  tx: SeedTransaction,
  table: TTable,
  wanted: readonly W[],
  {
    existing,
    keyOf,
    toRow,
  }: {
    existing: (tx: SeedTransaction) => Promise<Iterable<K>>;
    keyOf: (item: W) => K;
    toRow: (item: W) => Omit<PgInsertValue<TTable>, InsertStamps>;
  },
): Promise<void> {
  const present = new Set(await existing(tx));
  const missing = wanted.filter((item) => !present.has(keyOf(item)));

  if (missing.length === 0) return;

  await tx.insert(table).values(
    missing.map(
      // `Omit` of a generic loses the row's type for TS; `applyAudit` puts
      // back exactly the four stamps `InsertStamps` took out.
      (item) => applyAudit('insert', toRow(item), BOOTSTRAP_SESSION) as PgInsertValue<TTable>,
    ),
  );
}

/**
 * `insertMissing` keyed on `columns`, the key built once and read off both
 * sides: the table's rows and each `wanted`, which names its values under
 * the same properties. A part is compared as written, or through `fold`
 * where the unique index folds it — a name's `lower()` — and null and absent
 * are one empty part, as a link's unset keys are. A one-column key reads only
 * the wanted values; a wider one reads the table, narrowed by `where` if the
 * site scopes it. `deleted_at` is ignored unless `where` reads it, so a
 * retired row is not resurrected on the next run.
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
  }: {
    columns: readonly K[];
    fold?: { [Column in K]?: (value: string) => string };
    where?: SQL;
    toRow: (item: W) => Omit<PgInsertValue<TTable>, InsertStamps>;
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
  });
}

/**
 * Inserts each `wanted` whose key `present` lacks, and returns `present` with
 * each inserted row's id under its key: `insertMissing` for the two callers
 * that link the rows they insert. `present` is the caller's own read, as
 * `existing` is `insertMissing`'s, since each decides what present means — a
 * compendium identity, or a seed key whose soft-deleted row answers null —
 * and `keyOfRow` reads the key back off an inserted row.
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

  const inserted = (await tx
    .insert(table)
    .values(
      missing.map(
        (item) => applyAudit('insert', toRow(item), BOOTSTRAP_SESSION) as PgInsertValue<TTable>,
      ),
    )
    .returning()) as (TTable['$inferSelect'] & { id: string })[];

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
 * What a vocabulary seed takes as present (MB.172): every row's `seed_key`,
 * live or soft-deleted, so a row the seed wrote is its own whatever an admin
 * has since renamed it or whether they retired it; and every live row's slug,
 * so a row an admin wrote under a seed name is not met by a second one the
 * slug index would refuse. Typed on the union, which Drizzle's `from()`
 * accepts where it cannot narrow a generic.
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

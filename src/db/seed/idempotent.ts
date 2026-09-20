import { sql } from 'drizzle-orm';
import type { PgInsertValue, PgTable } from 'drizzle-orm/pg-core';
// `./bootstrap-admin` first, and load-bearing — see minimal.ts.
import { BOOTSTRAP_SESSION, insertBootstrapAdmin } from './bootstrap-admin';
import { applyAudit } from '../audit';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import type { SeedDatabase, SeedTransaction } from './index';

// The three moves every seed makes. Writes go through the handle the caller
// gives, not `withAudit` (claude-docs/design-decisions/m1.21-seed-writes-through-its-handle.md).

/**
 * The seed's transaction: the GUC published exactly as `withAudit` publishes it
 * — parameterised `set_config`, transaction-local — and the bootstrap admin
 * present before `body` writes a row that names it as creator.
 */
export async function beginSeedTransaction<T>(
  db: SeedDatabase,
  body: (tx: SeedTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${BOOTSTRAP_USER_ID}, true)`);
    await insertBootstrapAdmin(tx);
    return body(tx);
  });
}

/** The stamps `applyAudit('insert', …)` supplies, so a caller's row is typed without them. */
type InsertStamps = 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy';

/**
 * Inserts every `wanted` whose key `existing` did not return, stamped by the
 * bootstrap admin, and touches nothing already present. `existing` is the
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
 * `map.get(key)`, or the error `describe` writes. Every seed lookup is
 * unreachable while the literals agree with each other, and a silent
 * `undefined` would fail NOT NULL several rows later, naming the wrong row.
 */
export function requireFrom<K, V>(map: Map<K, V>, key: K, describe: () => string): V {
  const value = map.get(key);

  if (value === undefined) throw new Error(describe());

  return value;
}

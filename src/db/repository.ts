import { and, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import { applyAudit, auditColumns, type AuditSession } from './audit';
// The choke point the rule exists to protect — enforced by lint as of M1.17.
// oxlint-disable-next-line no-restricted-imports
import { db } from './connection';

// CLAUDE.md rule 2: the only application module that imports the client
// (claude-docs/db.md, "Who may import the client"). `db` is not re-exported and
// callers never see the transaction — `withAudit`'s `AuditWriter` is the sole
// write mechanism, so no write can skip audit stamping. Rule 4: every exported
// finder applies `deleted_at IS NULL` here, guarded by
// tests/guards/soft-delete-finder-guard.test.ts.

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type AuditColumnName = keyof typeof auditColumns;

// A table admits the methods its own columns allow: `{ deletedAt?: never }` is
// satisfied only by a table without the column.
type SoftDeletable = { deletedAt: AnyPgColumn };
type HardDeletable = { deletedAt?: never };

/** A table's own columns, with every audit column removed — they come from the session. */
type Writable<TTable extends PgTable> = Omit<TTable['$inferInsert'], AuditColumnName>;

export interface AuditWriter {
  /** Insert one row, stamping created_* and updated_* from the session. */
  insert<TTable extends PgTable>(
    table: TTable,
    values: Writable<TTable>,
  ): Promise<TTable['$inferSelect'][]>;
  /** Update matching rows, stamping updated_* only — created_* is never touched. */
  update<TTable extends PgTable>(
    table: TTable,
    values: Partial<Writable<TTable>>,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
  /** Soft-delete matching rows: stamps deleted_*, leaving the row in place (CLAUDE.md rule 4). */
  softDelete<TTable extends PgTable & SoftDeletable>(
    table: TTable,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * Hard-delete, for the join tables that carry no `deleted_at` (MB.34). A
   * table carrying one is rejected by the type.
   */
  delete<TTable extends PgTable & HardDeletable>(
    table: TTable,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
}

// Drizzle types `.values()`/`.set()` against the table's own insert model, which
// `applyAudit` widens by exactly that table's audit columns; the cast is
// confined here.
function writerFor(tx: Transaction, session: AuditSession): AuditWriter {
  return {
    insert: (table, values) =>
      tx
        .insert(table)
        .values(applyAudit('insert', values, session) as never)
        .returning() as never,
    update: (table, values, where) =>
      tx
        .update(table)
        .set(applyAudit('update', values, session) as never)
        .where(where)
        .returning() as never,
    softDelete: (table, where) =>
      tx
        .update(table)
        .set(applyAudit('delete', {}, session) as never)
        .where(where)
        .returning() as never,
    delete: (table, where) => tx.delete(table).where(where).returning() as never,
  };
}

/**
 * The only write path: one transaction, the acting user published as
 * `app.current_user_id`, every stamp from `session` — never a request body —
 * and a rollback if `fn` throws.
 */
export async function withAudit<T>(
  session: AuditSession,
  fn: (write: AuditWriter) => Promise<T>,
): Promise<T> {
  if (!session?.userId) {
    throw new Error('withAudit requires a session with an acting user id');
  }

  return db.transaction(async (tx) => {
    // Nothing reads the GUC in v1; it is what makes the v2 history trigger and
    // deferred RLS one migration. **Do not remove it as unused.** `set_config(…,
    // true)` is `SET LOCAL` with a bind parameter: discarded at COMMIT or
    // ROLLBACK, never riding a pooled connection into the next request
    // (claude-docs/db.md, "app.current_user_id, published per transaction").
    await tx.execute(sql`select set_config('app.current_user_id', ${session.userId}, true)`);
    return fn(writerFor(tx, session));
  });
}

/**
 * `deleted_at IS NULL`, or `undefined` for a table without the column. Decided
 * by the table's shape, so there is no flag a caller could pass to skip it.
 */
function notSoftDeleted<TTable extends PgTable>(table: TTable): SQL | undefined {
  const deletedAt = (table as Partial<SoftDeletable>).deletedAt;
  return deletedAt ? sql`${deletedAt} is null` : undefined;
}

// The one place a read query is built; not exported, so no public handle
// skips the filter.
function selectFrom<TTable extends PgTable>(
  table: TTable,
  where: SQL | undefined,
): Promise<TTable['$inferSelect'][]> {
  // Same cast as `writerFor`: `.from()` is typed against the table's own
  // generic parameter.
  return db
    .select()
    .from(table as never)
    .where(where) as never;
}

/** All matching, non-soft-deleted rows. The default and normal-use finder. */
export function findMany<TTable extends PgTable>(
  table: TTable,
  where?: SQL,
): Promise<TTable['$inferSelect'][]> {
  // `and` drops undefined conditions, so a join table's read is the caller's
  // `where` alone.
  return selectFrom(table, and(notSoftDeleted(table), where));
}

/** The first matching, non-soft-deleted row, or `undefined`. */
export async function findOne<TTable extends PgTable>(
  table: TTable,
  where?: SQL,
): Promise<TTable['$inferSelect'] | undefined> {
  const [row] = await findMany(table, where);
  return row;
}

/**
 * The escape hatch, for admin restore paths only. Named rather than a flag a
 * later edit could default the wrong way; a second bypass is argued for in
 * the diff.
 */
export function findManyIncludingSoftDeleted<TTable extends PgTable>(
  table: TTable,
  where?: SQL,
): Promise<TTable['$inferSelect'][]> {
  return selectFrom(table, where);
}

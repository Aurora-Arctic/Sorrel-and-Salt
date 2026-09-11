import { sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { applyAudit, auditColumns, type AuditSession } from './audit';
// M1.17: this module is the choke point the no-restricted-imports rule exists
// to protect, so it is the one application module allowed to import the client.
// oxlint-disable-next-line no-restricted-imports
import { db } from './connection';

// DESIGN.md §5 / CLAUDE.md rule 2: this is the only application module that
// imports the database client — the three infrastructure exemptions are listed
// in claude-docs/db.md, "Who may import the client", and the boundary is
// enforced by lint as of M1.17. `db` is deliberately not re-exported — the
// sole exported write mechanism is `withAudit`, so there is no public API
// through which a write can skip audit stamping (M1.16). Callers never see
// the Drizzle transaction itself either: they get the narrow `AuditWriter`
// below, whose three methods each run their payload through `applyAudit`
// first.
//
// Read-side finders (and their `deleted_at IS NULL` builder) are M1.20 —
// they land on top of this choke point rather than beside it.

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type AuditColumnName = keyof typeof auditColumns;

/** A table's own columns, with the six audit ones removed — they come from the session. */
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
  softDelete<TTable extends PgTable>(table: TTable, where: SQL): Promise<TTable['$inferSelect'][]>;
}

// Drizzle's `.values()`/`.set()` are typed against the table's own insert
// model, which `applyAudit` widens by the audit fields it adds; the audit
// fields it adds are exactly that table's audit columns, so the cast is
// sound and is confined to these three lines rather than every call site.
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
  };
}

/**
 * The only write path. Opens one transaction, publishes the acting user to
 * the database as `app.current_user_id`, hands `fn` a writer that stamps
 * every statement's audit columns from `session` — never from a request
 * body — and rolls the whole transaction back if `fn` throws.
 */
export async function withAudit<T>(
  session: AuditSession,
  fn: (write: AuditWriter) => Promise<T>,
): Promise<T> {
  if (!session?.userId) {
    throw new Error('withAudit requires a session with an acting user id');
  }

  return db.transaction(async (tx) => {
    // DESIGN.md §5 / §10: the acting user, published to the database so an
    // RLS policy (M6.4) can read it back with
    // `current_setting('app.current_user_id')` and enforce access without
    // trusting application code. `SET LOCAL` takes no bind parameters —
    // it would mean interpolating a user id into SQL text — so this uses
    // `set_config(name, value, is_local => true)`, its parameterised
    // equivalent with identical transaction-scoped semantics: the value is
    // discarded at COMMIT or ROLLBACK and so can never ride a pooled
    // connection into the next request.
    await tx.execute(sql`select set_config('app.current_user_id', ${session.userId}, true)`);
    return fn(writerFor(tx, session));
  });
}

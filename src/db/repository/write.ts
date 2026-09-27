import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { applyAudit, type AuditSession } from '../audit';
// The choke point the rule exists to protect — enforced by lint as of M1.17.
// oxlint-disable-next-line no-restricted-imports
import { db } from '../connection';
import type { Membership } from '@/modules/coven';
import {
  scopedTo,
  type HardDeletable,
  type Identified,
  type SoftDeletable,
  type Unscoped,
  type WorkspaceScoped,
  type Writable,
  type WritableInWorkspace,
} from './shapes';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface AuditWriter {
  /** Insert one row, stamping created_* and updated_* from the session. */
  insert<TTable extends PgTable & Unscoped>(
    table: TTable,
    values: Writable<TTable>,
  ): Promise<TTable['$inferSelect'][]>;
  /** Insert one row into the workspace the proof names, filling `workspace_id` from it. */
  insertInWorkspace<TTable extends PgTable & WorkspaceScoped>(
    membership: Membership,
    table: TTable,
    values: WritableInWorkspace<TTable>,
  ): Promise<TTable['$inferSelect'][]>;
  /** Update matching rows, stamping updated_* only — created_* is never touched. */
  update<TTable extends PgTable & Unscoped>(
    table: TTable,
    values: Partial<Writable<TTable>>,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * The same, naming the one row by its own id — for a table no proof scopes.
   * A service cannot build the `where` above: MB.33 bars it from importing
   * `drizzle-orm` at runtime.
   */
  updateById<TTable extends PgTable & Unscoped & Identified>(
    table: TTable,
    id: string,
    values: Partial<Writable<TTable>>,
  ): Promise<TTable['$inferSelect'][]>;
  /** The same, with `workspace_id = membership.workspaceId` ANDed onto the `where`. */
  updateInWorkspace<TTable extends PgTable & WorkspaceScoped>(
    membership: Membership,
    table: TTable,
    values: Partial<WritableInWorkspace<TTable>>,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * The same, naming the one row by its own id. A service cannot build the
   * `where` the method above wants — MB.33 bars it from importing
   * `drizzle-orm` at runtime — so the predicate every entity update needs is
   * built here instead.
   */
  updateByIdInWorkspace<TTable extends PgTable & WorkspaceScoped & Identified>(
    membership: Membership,
    table: TTable,
    id: string,
    values: Partial<WritableInWorkspace<TTable>>,
  ): Promise<TTable['$inferSelect'][]>;
  /** Soft-delete matching rows: stamps deleted_*, leaving the row in place (CLAUDE.md rule 4). */
  softDelete<TTable extends PgTable & SoftDeletable & Unscoped>(
    table: TTable,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
  /** The same, scoped by the proof. */
  softDeleteInWorkspace<TTable extends PgTable & SoftDeletable & WorkspaceScoped>(
    membership: Membership,
    table: TTable,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * Hard-delete, for the join tables that carry no `deleted_at` (MB.34). A
   * table carrying one is rejected by the type, as is one carrying
   * `workspace_id`: no table is both today, and the one that is first adds its
   * proof-scoped counterpart rather than being hard-deleted unscoped.
   */
  delete<TTable extends PgTable & HardDeletable & Unscoped>(
    table: TTable,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
}

// Drizzle types `.values()`/`.set()` against the table's own insert model, which
// `applyAudit` widens by exactly that table's audit columns; the cast is
// confined here.
function writerFor(tx: Transaction, session: AuditSession): AuditWriter {
  const insert = (table: PgTable, values: object) =>
    tx
      .insert(table)
      .values(applyAudit('insert', values, session) as never)
      .returning() as never;

  const update = (table: PgTable, values: object, where: SQL | undefined) =>
    tx
      .update(table)
      .set(applyAudit('update', values, session) as never)
      .where(where)
      .returning() as never;

  const softDelete = (table: PgTable, where: SQL | undefined) =>
    tx
      .update(table)
      .set(applyAudit('delete', {}, session) as never)
      .where(where)
      .returning() as never;

  return {
    insert,
    // `workspaceId` last, though `values` is typed without it: the column
    // answers to the proof even if a cast smuggled one in.
    insertInWorkspace: (membership, table, values) =>
      insert(table, { ...values, workspaceId: membership.workspaceId }),
    update,
    updateById: (table, id, values) => update(table, values, eq(table.id, id)),
    updateInWorkspace: (membership, table, values, where) =>
      update(table, values, and(scopedTo(membership, table), where)),
    updateByIdInWorkspace: (membership, table, id, values) =>
      update(table, values, and(scopedTo(membership, table), eq(table.id, id))),
    softDelete,
    softDeleteInWorkspace: (membership, table, where) =>
      softDelete(table, and(scopedTo(membership, table), where)),
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

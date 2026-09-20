import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import { applyAudit, auditColumns, type AuditSession } from './audit';
import { workspaceMembers } from './schema/workspaces';
// The choke point the rule exists to protect — enforced by lint as of M1.17.
// oxlint-disable-next-line no-restricted-imports
import { db } from './connection';
// Type-only, so it is erased and no runtime cycle forms with the service that
// imports `findWorkspaceRole` below. The brand has to live beside the check
// that mints it (CLAUDE.md rule 1), which is why the direction is this way up.
import type { WorkspaceRole } from '../services/access-control';
import type { Membership } from '../services/membership';

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

// The same shape for rule 5's proof: a table carrying `workspace_id` scopes
// itself and may only be reached with a `Membership`, and `{ workspaceId?:
// never }` is the complement — every other table. `spell_ingredients` and
// `spell_categories` are neither, since they reach their workspace through
// `spells`; claude-docs/db.md, "The Membership proof", names that gap and the
// tests that cover it.
type WorkspaceScoped = { workspaceId: AnyPgColumn };
type Unscoped = { workspaceId?: never };

/** A table's own columns, with every audit column removed — they come from the session. */
type Writable<TTable extends PgTable> = Omit<TTable['$inferInsert'], AuditColumnName>;

/** The same, minus `workspaceId` — it comes from the proof, for the same reason. */
type WritableInWorkspace<TTable extends PgTable> = Omit<Writable<TTable>, 'workspaceId'>;

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
  /** The same, with `workspace_id = membership.workspaceId` ANDed onto the `where`. */
  updateInWorkspace<TTable extends PgTable & WorkspaceScoped>(
    membership: Membership,
    table: TTable,
    values: Partial<WritableInWorkspace<TTable>>,
    where: SQL,
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

/**
 * The proof's own predicate. Built here rather than by the caller: a
 * `workspaceId` passed alongside the proof is a second source that can
 * disagree with it.
 */
function scopedTo<TTable extends PgTable & WorkspaceScoped>(
  membership: Membership,
  table: TTable,
): SQL {
  return eq(table.workspaceId, membership.workspaceId);
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
    updateInWorkspace: (membership, table, values, where) =>
      update(table, values, and(scopedTo(membership, table), where)),
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
export function findMany<TTable extends PgTable & Unscoped>(
  table: TTable,
  where?: SQL,
): Promise<TTable['$inferSelect'][]> {
  // `and` drops undefined conditions, so a join table's read is the caller's
  // `where` alone.
  return selectFrom(table, and(notSoftDeleted(table), where));
}

/** The first matching, non-soft-deleted row, or `undefined`. */
export async function findOne<TTable extends PgTable & Unscoped>(
  table: TTable,
  where?: SQL,
): Promise<TTable['$inferSelect'] | undefined> {
  const [row] = await findMany(table, where);
  return row;
}

/** All matching, non-soft-deleted rows inside the workspace the proof names. */
export function findManyInWorkspace<TTable extends PgTable & WorkspaceScoped>(
  membership: Membership,
  table: TTable,
  where?: SQL,
): Promise<TTable['$inferSelect'][]> {
  return selectFrom(table, and(scopedTo(membership, table), notSoftDeleted(table), where));
}

/** The first such row, or `undefined` — including when it belongs to another workspace. */
export async function findOneInWorkspace<TTable extends PgTable & WorkspaceScoped>(
  membership: Membership,
  table: TTable,
  where?: SQL,
): Promise<TTable['$inferSelect'] | undefined> {
  const [row] = await findManyInWorkspace(membership, table, where);
  return row;
}

/**
 * The escape hatch, for admin restore paths only. Named rather than a flag a
 * later edit could default the wrong way; a second bypass is argued for in
 * the diff. Workspace-scoped tables are not reachable through it — v1 has no
 * restore UI, and the task that adds one adds its proof-scoped counterpart.
 */
export function findManyIncludingSoftDeleted<TTable extends PgTable & Unscoped>(
  table: TTable,
  where?: SQL,
): Promise<TTable['$inferSelect'][]> {
  return selectFrom(table, where);
}

/**
 * The one workspace-scoped read that takes no proof, because it is what mints
 * one: `assertMembership` has nothing to pass until this has answered. It is
 * narrow on purpose — a role, not rows — so it cannot stand in for a finder,
 * and `repository.test.ts` pins the export list so a second exception is a
 * decision rather than an addition.
 */
export async function findWorkspaceRole(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRole | undefined> {
  const [row] = await selectFrom(
    workspaceMembers,
    and(
      notSoftDeleted(workspaceMembers),
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.workspaceId, workspaceId),
    ),
  );
  return row?.role;
}

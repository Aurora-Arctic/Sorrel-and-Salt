import { and, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
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
// below, whose three stamping methods each run their payload through
// `applyAudit` first. Its fourth, `delete`, has nothing to stamp — it removes
// the row — and is typed to reach only the tables that carry no `deleted_at`
// (MB.34).
//
// CLAUDE.md rule 4 / DESIGN.md §5: every exported finder applies
// `deleted_at IS NULL` here, not at call sites — the read-side counterpart
// to the write choke point above. `selectFrom` is the one place a read query
// is built; it is not exported, so a caller can only reach a row through
// `findMany`/`findOne` (filtered) or the explicitly named
// `findManyIncludingSoftDeleted` escape hatch below. A finder written
// without the filter fails `src/test/soft-delete-finder-guard.test.ts`
// (M1.20), not review.

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type AuditColumnName = keyof typeof auditColumns;

// The two table shapes MB.34 split the schema into. Most tables spread
// `...auditColumns` and are soft-deleted; the three join tables
// (`ingredient_categories`, `spell_categories`, `spell_ingredients`) spread
// `...auditStampColumns` and are deleted outright — DESIGN.md §5, CLAUDE.md
// rule 4. Which methods a table admits follows from its own columns, so
// pointing the wrong one at it is a compile error rather than a review note:
// `{ deletedAt?: never }` is satisfied by a table that has no such column and
// by nothing else.
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
   * Hard-delete matching rows, for the join tables that carry no `deleted_at`
   * (MB.34). The escape hatch from rule 4, in the shape of
   * `findManyIncludingSoftDeleted`: named rather than a `{ hard: true }` flag a
   * later edit could default the wrong way, and narrow rather than general —
   * a table carrying `deletedAt` is rejected by the type, so this cannot become
   * the way a soft-deletable row is quietly destroyed.
   */
  delete<TTable extends PgTable & HardDeletable>(
    table: TTable,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
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
    delete: (table, where) => tx.delete(table).where(where).returning() as never,
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
    // DESIGN.md §5 / §10: the acting user, published to the database. Nothing
    // reads it back in v1 — it is here for the v2 history trigger and for the
    // policies MB.29 deferred to the public launch, either of which then costs
    // one migration rather than a re-audit of every write path. Do not remove
    // it as unused. `SET LOCAL` takes no bind parameters —
    // it would mean interpolating a user id into SQL text — so this uses
    // `set_config(name, value, is_local => true)`, its parameterised
    // equivalent with identical transaction-scoped semantics: the value is
    // discarded at COMMIT or ROLLBACK and so can never ride a pooled
    // connection into the next request.
    await tx.execute(sql`select set_config('app.current_user_id', ${session.userId}, true)`);
    return fn(writerFor(tx, session));
  });
}

/**
 * `deleted_at IS NULL` — CLAUDE.md rule 4, built once so no finder writes it by
 * hand — or `undefined` for a table that carries no such column (MB.34). The
 * test is the table's own shape rather than a caller-supplied flag, so a finder
 * cannot skip the filter on a table that has one: there is nothing to pass.
 */
function notSoftDeleted<TTable extends PgTable>(table: TTable): SQL | undefined {
  const deletedAt = (table as Partial<SoftDeletable>).deletedAt;
  return deletedAt ? sql`${deletedAt} is null` : undefined;
}

// The one place a read query is built. Not exported: everything reads
// through it, but only `findMany`/`findOne`/`findManyIncludingSoftDeleted`
// below can reach it, so there is no public handle that skips the filter —
// the same shape as `AuditWriter` above for writes.
function selectFrom<TTable extends PgTable>(
  table: TTable,
  where: SQL | undefined,
): Promise<TTable['$inferSelect'][]> {
  // Same shape as `writerFor` above: Drizzle's `.from()` is typed against the
  // table's own generic parameter, which a caller-supplied `TTable` doesn't
  // structurally satisfy — the cast is confined to this one line.
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
  // `and` drops an undefined condition and returns undefined when every one of
  // them is, so a join table's read is the caller's `where` alone.
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
 * The escape hatch, for admin restore paths only (DESIGN.md §14's trash
 * view / undo-a-soft-delete). Deliberately named so a reviewer sees exactly
 * what it does at the call site, rather than a generic `{ includeDeleted }`
 * flag a later edit could default the wrong way. Nothing else may bypass
 * `deleted_at IS NULL` — CLAUDE.md rule 4 — so a second bypass belongs here,
 * argued for in the diff, not as a new escape hatch beside it.
 */
export function findManyIncludingSoftDeleted<TTable extends PgTable>(
  table: TTable,
  where?: SQL,
): Promise<TTable['$inferSelect'][]> {
  return selectFrom(table, where);
}

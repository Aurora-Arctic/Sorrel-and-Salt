import { and, asc, desc, eq, getTableColumns, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import { auditColumns, users } from '../modules/identity/schema/users';
import { applyAudit, type AuditSession } from './audit';
import { accounts } from '../modules/identity/schema/auth';
import { spells } from '../modules/grimoire/schema/spells';
import { workspaceMembers, workspaces } from '../modules/coven/schema/workspaces';
// The choke point the rule exists to protect — enforced by lint as of M1.17.
// oxlint-disable-next-line no-restricted-imports
import { db } from './connection';
// Type-only, so it is erased and no runtime cycle forms with the service that
// imports `findWorkspaceRole` below. The brand has to live beside the check
// that mints it (CLAUDE.md rule 1), which is why the direction is this way up.
import type { WorkspaceRole, Membership } from '@/modules/coven';
import { InvalidCursor } from '../lib/errors';
import type { Cursor, PageEntry, PageRequest } from '../lib/pagination';

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
// never }` is the complement — every other table.
type WorkspaceScoped = { workspaceId: AnyPgColumn };
type Unscoped = { workspaceId?: never };

// And once more for visibility (M10.3), so that a table goes through exactly
// one finder — claude-docs/db.md, "Spell visibility". `spells` is
// workspace-scoped *and* carries a per-row reader rule, so `NotVisibilityScoped`
// takes it off the generic scoped finders and `findManySpells`/`findOneSpell`
// name it directly; the two join tables carry a `spell_id` and no workspace of
// their own, so `NotSpellScoped` takes them off the unscoped finders and
// `findManyInSpell` derives both scopes from the parent spell.
type NotVisibilityScoped = { visibility?: never };
type SpellScoped = { spellId: AnyPgColumn };
type NotSpellScoped = { spellId?: never };

/** A table with a surrogate key, which is every one but the three join tables. */
type Identified = { id: AnyPgColumn };

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

/**
 * `deleted_at IS NULL`, or `undefined` for a table without the column. Decided
 * by the table's shape, so there is no flag a caller could pass to skip it.
 */
function notSoftDeleted<TTable extends PgTable>(table: TTable): SQL | undefined {
  const deletedAt = (table as Partial<SoftDeletable>).deletedAt;
  return deletedAt ? sql`${deletedAt} is null` : undefined;
}

/**
 * A sort column a page can be keyed on. NOT NULL, because a NULL key makes
 * the row comparison below NULL and the row falls out of every page.
 */
type SortColumn = AnyPgColumn<{ notNull: true }>;

/** How `selectFrom` orders, bounds and keys a page; the cursor bounds are in its `where`. */
interface Keyset {
  sort: SortColumn;
  id: AnyPgColumn;
  request: PageRequest;
}

// The one place a read query is built; not exported, so no public handle
// skips the filter.
function selectFrom<TTable extends PgTable>(
  table: TTable,
  where: SQL | undefined,
): Promise<TTable['$inferSelect'][]>;
function selectFrom<TTable extends PgTable>(
  table: TTable,
  where: SQL | undefined,
  keyset: Keyset,
): Promise<PageEntry<TTable['$inferSelect']>[]>;
async function selectFrom(table: PgTable, where: SQL | undefined, keyset?: Keyset) {
  // The key is read as Postgres prints it: a `timestamptz` read into a Date
  // loses its microseconds, and a cursor built from it would replay rows.
  const selection = keyset && {
    row: getTableColumns(table),
    key: sql<string>`${keyset.sort}::text`,
  };
  // Same cast as `writerFor`: `.from()` is typed against the table's own
  // generic parameter.
  const query = db
    .select(selection as never)
    .from(table as never)
    .where(where)
    .$dynamic();
  if (!keyset) return query;

  const direction = keyset.request.inverted ? desc : asc;
  let rows: { row: Record<string, unknown>; key: string }[];
  try {
    rows = await query
      .orderBy(direction(keyset.sort), direction(keyset.id))
      .limit(keyset.request.limit);
  } catch (error) {
    // The only client text in a page query is the cursor's, so a data
    // exception here is a cursor that names no position in this list.
    if (isDataException(error)) throw new InvalidCursor();
    throw error;
  }
  return rows.map(({ row, key }) => ({ cursor: { key, id: String(row.id) }, node: row }));
}

/** SQLSTATE class 22 — a value that would not cast to its column's type. Drizzle wraps the driver's error as `cause`. */
function isDataException(error: unknown): boolean {
  const code = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
  return typeof code === 'string' && code.startsWith('22');
}

/**
 * The cursor bounds: rows strictly after `after` and before `before` in
 * `(sort, id)` order, whichever way the page walks. The cursor's text is cast
 * back to each column's own type, so it compares as the column does.
 */
function pageBounds({ sort, id, request }: Keyset): SQL | undefined {
  const at = ({ key, id: cursorId }: Cursor) =>
    sql`(cast(${key} as ${sql.raw(sort.getSQLType())}), cast(${cursorId} as ${sql.raw(id.getSQLType())}))`;
  return and(
    request.after && sql`(${sort}, ${id}) > ${at(request.after)}`,
    request.before && sql`(${sort}, ${id}) < ${at(request.before)}`,
  );
}

/** All matching, non-soft-deleted rows. The default and normal-use finder. */
export function findMany<TTable extends PgTable & Unscoped & NotSpellScoped>(
  table: TTable,
  where?: SQL,
): Promise<TTable['$inferSelect'][]> {
  // `and` drops undefined conditions, so a join table's read is the caller's
  // `where` alone.
  return selectFrom(table, and(notSoftDeleted(table), where));
}

/** The first matching, non-soft-deleted row, or `undefined`. */
export async function findOne<TTable extends PgTable & Unscoped & NotSpellScoped>(
  table: TTable,
  where?: SQL,
): Promise<TTable['$inferSelect'] | undefined> {
  const [row] = await findMany(table, where);
  return row;
}

/**
 * The live row with this id, or `undefined`. The read-side twin of
 * `write.updateById`: a service cannot build `eq(table.id, id)` itself (MB.33).
 */
export async function findOneById<TTable extends PgTable & Unscoped & NotSpellScoped & Identified>(
  table: TTable,
  id: string,
): Promise<TTable['$inferSelect'] | undefined> {
  const [row] = await findMany(table, eq(table.id, id));
  return row;
}

/** The live rows among these ids, in no particular order — a loader's batch read. */
export async function findManyByIds<
  TTable extends PgTable & Unscoped & NotSpellScoped & Identified,
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
 * One page of non-soft-deleted rows in `(sort, id)` order, each with the
 * cursor it was found at: CLAUDE.md rule 8's keyset half. `page` comes from
 * `resolvePage` in `src/lib/pagination.ts`, already clamped to the maximum.
 */
export function findPage<TTable extends PgTable & Unscoped & NotSpellScoped & Identified>(
  table: TTable,
  sort: SortColumn,
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
  sort: SortColumn,
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
 * §5's reader rule, as a predicate: the coven's own spells, shared ones plus
 * this reader's private ones. `created_by` is the author — §5 gives spells no
 * separate author column — so the proof supplies both halves and a caller has
 * no id to pass that could disagree with it.
 */
function readableSpells(membership: Membership): SQL | undefined {
  return and(
    scopedTo(membership, spells),
    notSoftDeleted(spells),
    or(eq(spells.visibility, 'workspace'), eq(spells.createdBy, membership.userId)),
  );
}

/** Every spell of this coven this member may read. */
export function findManySpells(membership: Membership): Promise<(typeof spells.$inferSelect)[]> {
  return selectFrom(spells, readableSpells(membership));
}

/**
 * One spell by id, or `undefined` — which is also the answer for another
 * coven's spell and for a private spell that is not this reader's. A caller
 * holding an id it saw elsewhere learns nothing from the difference.
 */
export async function findOneSpell(
  membership: Membership,
  spellId: string,
): Promise<typeof spells.$inferSelect | undefined> {
  const [row] = await selectFrom(spells, and(readableSpells(membership), eq(spells.id, spellId)));
  return row;
}

/**
 * A spell's rows in `spell_ingredients` or `spell_categories` — readable
 * exactly when the spell is. Neither table carries a `workspace_id` to scope
 * itself by, so the correlated `EXISTS` below is where both the coven and the
 * visibility come from; filtering after the fetch would hand a caller the
 * contents of a jar it may not open (rule 7).
 *
 * Written as `sql` rather than a Drizzle subquery on purpose: a subquery needs
 * a second select builder, and the repository holding exactly one is what
 * `soft-delete-finder-guard.test.ts` reads to prove no unfiltered read exists.
 */
export function findManyInSpell<TTable extends PgTable & SpellScoped & Unscoped>(
  membership: Membership,
  table: TTable,
  spellId: string,
): Promise<TTable['$inferSelect'][]> {
  return selectFrom(
    table,
    and(
      notSoftDeleted(table),
      eq(table.spellId, spellId),
      sql`exists (select 1 from ${spells} where ${spells.id} = ${table.spellId} and ${readableSpells(membership)})`,
    ),
  );
}

/**
 * The escape hatch, for admin restore paths only. Named rather than a flag a
 * later edit could default the wrong way; a second bypass is argued for in
 * the diff. Workspace-scoped tables are not reachable through it — v1 has no
 * restore UI, and the task that adds one adds its proof-scoped counterpart.
 */
export function findManyIncludingSoftDeleted<TTable extends PgTable & Unscoped & NotSpellScoped>(
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

/**
 * Every live membership each of these users holds, in a workspace that is
 * itself live. The second read that takes no proof, and for the reason the
 * first does: a user's own memberships span workspaces, so there is no one
 * workspace to hold a proof for. The service calling it decides whose ids may
 * be asked about; `repository.test.ts` pins the export list, so a third is a
 * decision.
 *
 * The workspace's `deleted_at` is a correlated `EXISTS` rather than a join,
 * for the reason `findManyInSpell` gives.
 */
export async function findMembershipsOfUsers(
  userIds: readonly string[],
): Promise<(typeof workspaceMembers.$inferSelect)[]> {
  if (userIds.length === 0) return [];
  return selectFrom(
    workspaceMembers,
    and(
      notSoftDeleted(workspaceMembers),
      inArray(workspaceMembers.userId, [...userIds]),
      sql`exists (select 1 from ${workspaces} where ${workspaces.id} = ${workspaceMembers.workspaceId} and ${notSoftDeleted(workspaces)})`,
    ),
  );
}

/**
 * Hard-deletes every provisional account: unverified, holding a provider
 * `accounts` row, and either untouched for `lifetimeSeconds` or created more
 * than `capSeconds` ago, both by the database's own clock, so a seeded row nobody can sign in to is never one. Its
 * `accounts` and `sessions` rows go with it by `ON DELETE CASCADE`.
 *
 * Hard rather than soft, and outside `withAudit`: Better Auth finds a user by
 * address without our `deleted_at` filter, so a tombstone would go on
 * blocking the owner's sign-in, and there is no session to stamp one with
 * (claude-docs/auth.md, "Provisional accounts"). The one users delete, pinned
 * by `soft-delete-finder-guard.test.ts`'s export list.
 */
export async function deleteProvisionalUsers(
  lifetimeSeconds: number,
  capSeconds: number,
): Promise<string[]> {
  const rows = await db
    .delete(users)
    .where(
      and(
        eq(users.emailVerified, false),
        or(
          sql`${users.updatedAt} < now() - make_interval(secs => ${lifetimeSeconds})`,
          sql`${users.createdAt} < now() - make_interval(secs => ${capSeconds})`,
        ),
        sql`exists (select 1 from ${accounts} where ${accounts.userId} = ${users.id})`,
      ),
    )
    .returning({ id: users.id });
  return rows.map((row) => row.id);
}

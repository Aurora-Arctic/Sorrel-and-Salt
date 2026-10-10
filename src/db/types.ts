import type { AnyPgColumn, ExtraConfigColumn } from 'drizzle-orm/pg-core';
import type postgres from 'postgres';
import type { userPrivilegeRoute } from '../modules/identity/schema/user-privilege-changes';
import type { auditStampColumnsReferencing, deletionColumnsReferencing } from './audit';

/** A thunk to `users.id`, resolved when the foreign key is read rather than when the columns are built. */
export type UsersIdReference = () => AnyPgColumn;

export type AuditOperation = 'insert' | 'update' | 'delete';

export interface AuditSession {
  userId: string;
  /**
   * The admin acting as `userId`, on an impersonation session alone (MB.53).
   * `userId` is still who the stamps name: impersonation reproduces what that
   * user would see and do.
   */
  impersonatedBy?: string;
}

/** How a privilege change came about, as `user_privilege_changes.via` records it. */
export type PrivilegeRoute = (typeof userPrivilegeRoute.enumValues)[number];

/**
 * What a write changing `users.role` or `users.can_create_workspace` declares
 * to `withAudit` (MB.195): the route, without which the trigger on `users`
 * refuses the change, and an optional reason the ledger row keeps.
 */
export interface PrivilegeDeclaration {
  via: PrivilegeRoute;
  note?: string;
}

/** The audit stamps' four names, read off the factory that builds them. */
export type StampField = keyof ReturnType<typeof auditStampColumnsReferencing>;

/** The two names the soft-deleted tables add, read off theirs. */
export type DeletionField = keyof ReturnType<typeof deletionColumnsReferencing>;

type AuditColumnBuilders = ReturnType<typeof auditStampColumnsReferencing> &
  ReturnType<typeof deletionColumnsReferencing>;

/**
 * The six audit fields as a write carries them, each typed as its column
 * holds it, non-null: a factory's rename or a seventh column reaches every
 * `Pick` and `Omit` of this without a list to keep beside it.
 */
export type AuditFields = {
  [Field in StampField | DeletionField]: AuditColumnBuilders[Field]['_']['data'];
};

export type WithoutAuditFields<T> = Omit<T, keyof AuditFields>;

/** `globalThis` as connection.ts extends it: the one client this process holds per `DATABASE_URL`. */
export interface ClientRegistry {
  __sorrelPostgresClients?: Map<string, postgres.Sql>;
}

/**
 * The mark on a table written only through its own named writer methods
 * (MB.198), put on it in its schema file by `namedWrites` in table-marks.ts.
 * `$writes` is a phantom key beside Drizzle's `$inferSelect`: no column can
 * be named like it, and nothing is added to the table at runtime
 * (claude-docs/db/write-path.md, "Table marks").
 */
export type NamedWrites = { readonly $writes: 'named' };

/** Every unmarked table: what each generic writer method demands, so a marked one is refused. */
export type Generic = { $writes?: never };

/** The columns a table's extra config sees, as far as schema-parts.ts's `liveUnique` reads them. */
export interface LiveTable {
  deletedAt: ExtraConfigColumn;
}

/** A table carrying the reference seed's key beside its tombstone. */
export interface SeedKeyedTable extends LiveTable {
  seedKey: ExtraConfigColumn;
}

/** What `vocabularyIndexes` reads of a vocabulary table: the columns `vocabularyColumns` built. */
export interface VocabularyTable extends SeedKeyedTable {
  name: ExtraConfigColumn;
  slug: ExtraConfigColumn;
  description: ExtraConfigColumn;
}

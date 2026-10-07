import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type postgres from 'postgres';

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

export type AuditFields = {
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  deletedAt: Date;
  deletedBy: string;
};

export type WithoutAuditFields<T> = Omit<T, keyof AuditFields>;

/** `globalThis` as connection.ts extends it: the one client this process holds per `DATABASE_URL`. */
export interface ClientRegistry {
  __sorrelPostgresClients?: Map<string, postgres.Sql>;
}

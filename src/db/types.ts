import type { AnyPgColumn } from 'drizzle-orm/pg-core';

/** A thunk to `users.id`, resolved when the foreign key is read rather than when the columns are built. */
export type UsersIdReference = () => AnyPgColumn;

export type AuditOperation = 'insert' | 'update' | 'delete';

export interface AuditSession {
  userId: string;
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

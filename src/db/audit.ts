import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { timestamp, uuid } from 'drizzle-orm/pg-core';

/** A thunk to `users.id`, resolved when the foreign key is read rather than when the columns are built. */
export type UsersIdReference = () => AnyPgColumn;

// Factories rather than column instances: every audit id references
// `users.id`, `users`' own rows included, and importing `users` from here
// would make this module and the identity module's `users.ts` import each
// other — a cycle that, entered from the wrong end, built `users` before
// `auditColumns` existed and silently dropped its stamps (MB.60). The
// instances live beside `users`, in src/modules/identity/schema/users.ts,
// so this module depends on nothing in a module and any schema file can be
// the first one loaded (claude-docs/db.md, "Audit columns and applyAudit").
export function auditStampColumnsReferencing(usersId: UsersIdReference) {
  return {
    createdAt: timestamp('created_at').notNull().defaultNow(),
    createdBy: uuid('created_by').notNull().references(usersId),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    updatedBy: uuid('updated_by').notNull().references(usersId),
  };
}

// The two the soft-deleted tables add to the stamps. Which tables take which:
// claude-docs/db.md, "Hard delete on the three join tables".
export function deletionColumnsReferencing(usersId: UsersIdReference) {
  return {
    deletedAt: timestamp('deleted_at'),
    deletedBy: uuid('deleted_by').references(usersId),
  };
}

export type AuditOperation = 'insert' | 'update' | 'delete';

export interface AuditSession {
  userId: string;
}

type AuditFields = {
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  deletedAt: Date;
  deletedBy: string;
};

const AUDIT_FIELD_NAMES = [
  'createdAt',
  'createdBy',
  'updatedAt',
  'updatedBy',
  'deletedAt',
  'deletedBy',
] as const;

type WithoutAuditFields<T> = Omit<T, keyof AuditFields>;

function stripAuditFields<T extends object>(payload: T): WithoutAuditFields<T> {
  const rest = { ...payload };
  for (const field of AUDIT_FIELD_NAMES) {
    delete (rest as Record<string, unknown>)[field];
  }
  return rest as WithoutAuditFields<T>;
}

/**
 * Stamps audit columns for one write. Any audit fields in the payload are
 * dropped: they come from the session, never the request body (CLAUDE.md rule 3).
 */
export function applyAudit<T extends object>(
  operation: 'insert',
  payload: T,
  session: AuditSession,
): WithoutAuditFields<T> & Pick<AuditFields, 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>;
export function applyAudit<T extends object>(
  operation: 'update',
  payload: T,
  session: AuditSession,
): WithoutAuditFields<T> & Pick<AuditFields, 'updatedAt' | 'updatedBy'>;
export function applyAudit<T extends object>(
  operation: 'delete',
  payload: T,
  session: AuditSession,
): WithoutAuditFields<T> & Pick<AuditFields, 'deletedAt' | 'deletedBy'>;
export function applyAudit<T extends object>(
  operation: AuditOperation,
  payload: T,
  session: AuditSession,
): unknown {
  const rest = stripAuditFields(payload);
  const now = new Date();

  switch (operation) {
    case 'insert':
      return {
        ...rest,
        createdAt: now,
        createdBy: session.userId,
        updatedAt: now,
        updatedBy: session.userId,
      };
    case 'update':
      return { ...rest, updatedAt: now, updatedBy: session.userId };
    case 'delete':
      return { ...rest, deletedAt: now, deletedBy: session.userId };
  }
}

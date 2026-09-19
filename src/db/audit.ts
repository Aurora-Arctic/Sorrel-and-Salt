import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './schema/users';

// Every audit id references users.id, `users`' own rows included, so this
// module and schema/users.ts import each other: the thunk defers the runtime
// cycle and the explicit `AnyPgColumn` stops TypeScript reporting "audit.ts
// circularly references itself". The cycle also constrains import order in
// seed modules (claude-docs/db.md, "The seed module").
export const auditStampColumns = {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: uuid('created_by')
    .notNull()
    .references((): AnyPgColumn => users.id),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by')
    .notNull()
    .references((): AnyPgColumn => users.id),
};

// Defined as the four stamps plus two, so the six-column set cannot drift.
// Which tables take which: claude-docs/db.md, "Hard delete on the three join tables".
export const auditColumns = {
  ...auditStampColumns,
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by').references((): AnyPgColumn => users.id),
};

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

import { timestamp, uuid } from 'drizzle-orm/pg-core';

// The `users` table doesn't exist until M2.1, so `createdBy`/`updatedBy`/
// `deletedBy` can't carry `.references(() => users.id)` yet. Each table that
// spreads `...auditColumns` will need the FK added once `users` lands.
export const auditColumns = {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: uuid('created_by').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by').notNull(),
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by'),
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
 * Stamps audit columns for one write, ignoring any `*_by`/`*_at` audit
 * fields the caller's payload might carry — those always come from the
 * session, never the request body (CLAUDE.md rule 3).
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

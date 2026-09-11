import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './schema/users';

// DESIGN.md §5: every audit id references users.id. audit.ts and
// schema/users.ts import each other — users.ts spreads auditColumns, and
// auditColumns points back at users.id, including for users' own rows
// (users.created_by -> users.id). Drizzle's `() => users.id` thunk defers
// evaluation until the FK is actually built (migration generation, not
// module load), so the runtime cycle resolves fine; TypeScript still needs
// the explicit `AnyPgColumn` return annotation below or it reports "audit.ts
// circularly references itself", because it can't otherwise infer the
// thunk's return type without first fully resolving users.ts, which is
// still resolving audit.ts.
export const auditColumns = {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: uuid('created_by')
    .notNull()
    .references((): AnyPgColumn => users.id),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: uuid('updated_by')
    .notNull()
    .references((): AnyPgColumn => users.id),
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

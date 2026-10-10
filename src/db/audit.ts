import { sql } from 'drizzle-orm';
import { timestamp, uuid } from 'drizzle-orm/pg-core';
import type {
  ActorExecutor,
  PublishedActor,
  UsersIdReference,
  AuditOperation,
  AuditSession,
  AuditFields,
  DeletionField,
  StampField,
  WithoutAuditFields,
} from './types';

// Factories rather than column instances: every audit id references
// `users.id`, `users`' own rows included, and importing `users` from here
// would make this module and the identity module's `users.ts` import each
// other — a cycle that, entered from the wrong end, built `users` before
// `auditColumns` existed and silently dropped its stamps (MB.60). The
// instances live beside `users`, in src/modules/identity/schema/users.ts,
// so this module depends on nothing in a module and any schema file can be
// the first one loaded (claude-docs/db/audit-columns.md, "Audit columns and applyAudit").
export function auditStampColumnsReferencing(usersId: UsersIdReference) {
  return {
    createdAt: timestamp('created_at').notNull().defaultNow(),
    createdBy: uuid('created_by').notNull().references(usersId),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    updatedBy: uuid('updated_by').notNull().references(usersId),
  };
}

// The two the soft-deleted tables add to the stamps. Which tables take which:
// claude-docs/db/hard-delete-join-tables.md, "Hard delete on two join tables".
export function deletionColumnsReferencing(usersId: UsersIdReference) {
  return {
    deletedAt: timestamp('deleted_at'),
    deletedBy: uuid('deleted_by').references(usersId),
  };
}

// The six names a payload is stripped of, read off the factories rather than
// listed beside them, so a column added to either is stripped too. The
// builders are thrown away: none is spread into a table, so the reference
// is never resolved.
const unresolved: UsersIdReference = () => {
  throw new Error('An audit field name list resolves no foreign key');
};
const AUDIT_FIELD_NAMES = Object.keys({
  ...auditStampColumnsReferencing(unresolved),
  ...deletionColumnsReferencing(unresolved),
}) as (keyof AuditFields)[];

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
): WithoutAuditFields<T> & Pick<AuditFields, StampField>;
export function applyAudit<T extends object>(
  operation: 'update',
  payload: T,
  session: AuditSession,
): WithoutAuditFields<T> & Pick<AuditFields, 'updatedAt' | 'updatedBy'>;
export function applyAudit<T extends object>(
  operation: 'delete',
  payload: T,
  session: AuditSession,
): WithoutAuditFields<T> & Pick<AuditFields, DeletionField>;
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

/**
 * Publishes who is writing as the four transaction-local settings every write
 * publishes — `app.current_user_id`, `app.impersonated_by`,
 * `app.privilege_route` and `app.privilege_note` — each always set, an
 * absent one as '', so no reader sees a value an earlier transaction left on
 * a pooled connection. `set_config(…, true)` is `SET LOCAL` with a bind
 * parameter, and one statement costs one round trip
 * (claude-docs/db/write-path.md, "app.current_user_id, published per
 * transaction"). The executor is the caller's transaction, so this module
 * stays client-free and serves `withAudit` and the seed alike.
 */
export async function publishActor(
  executor: ActorExecutor,
  { userId, impersonatedBy, route, note }: PublishedActor,
): Promise<void> {
  await executor.execute(
    sql`select set_config('app.current_user_id', ${userId}, true), set_config('app.impersonated_by', ${impersonatedBy ?? ''}, true), set_config('app.privilege_route', ${route ?? ''}, true), set_config('app.privilege_note', ${note ?? ''}, true)`,
  );
}

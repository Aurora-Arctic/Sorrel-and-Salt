import { sql } from 'drizzle-orm';
import { pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { auditColumns, users } from './users';

// A pgEnum because the set is closed: `bootstrap` is a promotion by
// ADMIN_BOOTSTRAP_EMAIL, or a row the ledger started with, and the other two
// are an admin's act.
export const adminRoleChange = pgEnum('admin_role_change', ['bootstrap', 'grant', 'revoke']);

// The ledger of who is an admin: one row per change to `users.role`, since the
// next update to a user's row overwrites its `updated_by`. `created_by` is the
// actor and `created_at` when. Append-only by the repository rather than by
// grant, since `sorrel` owns its tables and a REVOKE would not bind it: the
// writer's `NotAppendOnly` refuses it every update and delete. One privilege's
// account, not the v2 edit history (claude-docs/design-decisions/m2.9-granting-admin.md,
// "What the audit trail records").
export const adminRoleChanges = pgTable('admin_role_changes', {
  id: uuid('id')
    .default(sql`pg_catalog.gen_random_uuid()`)
    .primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  change: adminRoleChange('change').notNull(),
  note: text('note'),
  // The full spread like every non-join table, though nothing in v1 sets the
  // delete pair: one shape for every audited table (CLAUDE.md rule 3).
  ...auditColumns,
});

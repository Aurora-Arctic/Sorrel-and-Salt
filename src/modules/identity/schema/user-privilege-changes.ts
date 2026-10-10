import { sql } from 'drizzle-orm';
import { pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { auditColumns, users } from './users';

// pgEnums because each set is closed. The privilege names the `users` column
// a change was to, `role` as `admin` and `can_create_workspace` as
// `create_workspace`, so a future flag is a value here and a line in MB.195's
// trigger rather than a table.
export const userPrivilege = pgEnum('user_privilege', ['admin', 'create_workspace']);

export const userPrivilegeChange = pgEnum('user_privilege_change', ['grant', 'revoke']);

// How a change came about: `bootstrap` is the primary admin's promotion by
// ADMIN_BOOTSTRAP_EMAIL, `admin` an admin's act on `/admin/users`,
// `invitation` an acceptance, and `manual` a `psql` fix that declared itself.
export const userPrivilegeRoute = pgEnum('user_privilege_route', [
  'bootstrap',
  'admin',
  'invitation',
  'manual',
]);

// The one privilege ledger: one row per change to a privilege column on
// `users`, since the next update to a user's row overwrites its `updated_by`.
// `created_by` is the actor and `created_at` when. Append-only by the
// database, not by the writer's types: the migration's `forbid_rewrite`
// trigger refuses every update and delete from any client. It replaces MB.58's
// `admin_role_changes` and MB.193's `workspace_creation_changes`, and is a
// privilege's account, not §13's edit history
// (claude-docs/design-decisions/mb.194-privilege-ledger-by-trigger.md).
export const userPrivilegeChanges = pgTable('user_privilege_changes', {
  id: uuid('id')
    .default(sql`pg_catalog.gen_random_uuid()`)
    .primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  privilege: userPrivilege('privilege').notNull(),
  change: userPrivilegeChange('change').notNull(),
  via: userPrivilegeRoute('via').notNull(),
  note: text('note'),
  // The full spread like every non-join table, though `forbid_rewrite` keeps
  // the delete pair null: one shape for every audited table (CLAUDE.md rule 3).
  ...auditColumns,
});

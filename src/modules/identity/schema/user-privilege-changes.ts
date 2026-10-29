import { pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { auditColumns, users } from './users';
import { idColumn } from '../../../db/schema-parts';

// pgEnums because each set is closed. The privilege names the `users` column
// a change was to, `role` as `admin` or `curator` and
// `can_create_workspace` as `create_workspace`, so a future flag is a value
// here and a line in the trigger rather than a table.
export const userPrivilege = pgEnum('user_privilege', ['admin', 'create_workspace', 'curator']);

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

// The one privilege ledger: one row per change to a privilege column on `users`, since the next update overwrites its `updated_by`.
// Append-only by the database, not by the writer's types: the `forbid_rewrite` trigger refuses every update and delete
// (claude-docs/design-decisions/mb.194-privilege-ledger-by-trigger.md).
export const userPrivilegeChanges = pgTable('user_privilege_changes', {
  id: idColumn(),
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

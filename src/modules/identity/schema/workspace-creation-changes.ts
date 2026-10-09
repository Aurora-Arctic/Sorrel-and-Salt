import { sql } from 'drizzle-orm';
import { pgEnum, pgTable, uuid } from 'drizzle-orm/pg-core';
import { auditColumns, users } from './users';

// A pgEnum because the set is closed: the four routes by which
// `users.can_create_workspace` changes. `grant` and `revoke` are an admin's
// act on `/admin/users` (M5.8), `invitation` is accepting a workspace
// invitation (M7.5), and `admin` is being made admin while the flag was off
// (MB.177, MB.59).
export const workspaceCreationChange = pgEnum('workspace_creation_change', [
  'grant',
  'revoke',
  'invitation',
  'admin',
]);

// The ledger of who may create a workspace: one row per change to
// `users.can_create_workspace`, since the next update to a user's row
// overwrites its `updated_by`. `created_by` is the actor and `created_at`
// when. Append-only by the repository, as MB.58's `admin_role_changes` is:
// its `change` column puts it under the writer's `NotAppendOnly`. Not
// backfilled, since who set a flag held before it is not known
// (claude-docs/design-decisions/m5.8-revoking-workspace-creation.md).
export const workspaceCreationChanges = pgTable('workspace_creation_changes', {
  id: uuid('id')
    .default(sql`pg_catalog.gen_random_uuid()`)
    .primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  change: workspaceCreationChange('change').notNull(),
  // The full spread like every non-join table, though nothing in v1 sets the
  // delete pair: one shape for every audited table (CLAUDE.md rule 3).
  ...auditColumns,
});

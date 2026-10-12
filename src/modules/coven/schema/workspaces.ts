import { pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../../identity/schema/users';
import { auditColumns } from '../../identity/schema/users';
import { idColumn, liveUnique } from '../../../db/schema-parts';

// Declared viewer, member, owner. Nothing compares two roles: each carries its
// own permission statements (../services/access-control.ts), so the order here
// is documentation. `owner` is not invitable — `invitations` carries the
// CHECK (MB.201).
export const workspaceRole = pgEnum('workspace_role', ['viewer', 'member', 'owner']);

// No `kind` column and no automatic workspace: every workspace takes members
// and is deleted by an owner. Only the URL segment says coven.
export const workspaces = pgTable(
  'workspaces',
  {
    id: idColumn(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    ...auditColumns,
  },
  (table) => [
    // Partial per CLAUDE.md rule 4: the slug is what /coven/[slug] routes on.
    liveUnique('workspaces_slug_unique', table, table.slug),
  ],
);

// Keyed on the pair; a surrogate id would let a user join twice.
export const workspaceMembers = pgTable(
  'workspace_members',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: workspaceRole('role').notNull(),
    // Distinct from `created_at`: a role change rewrites the row without
    // changing when the person joined.
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
    ...auditColumns,
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.userId] })],
);

import {
  boolean,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../../identity/schema/users';
import { auditColumns } from '../../identity/schema/users';
import { idColumn, liveUnique } from '../../../db/schema-parts';

// Declared viewer, member, owner. Nothing compares two roles: each carries its
// own permission statements (../services/access-control.ts), so the order here
// is documentation. `owner` is not invitable — `invitations` carries the
// CHECK.
export const workspaceRole = pgEnum('workspace_role', ['viewer', 'member', 'owner']);

// No `kind` column: every workspace takes members, and an owner deletes it.
// The one exception is the demo coven, marked by `demo` rather than a kind,
// which is seeded on every environment and cannot be deleted. Only the URL
// segment says coven.
export const workspaces = pgTable(
  'workspaces',
  {
    id: idColumn(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    // True on the one demo coven; the index below allows at most one live row.
    demo: boolean('demo').notNull().default(false),
    ...auditColumns,
  },
  (table) => [
    // Partial per CLAUDE.md rule 4: the slug is what /coven/[slug] routes on.
    liveUnique('workspaces_slug_unique', table, table.slug),
    // Partial on `demo` as well as `deleted_at`: only the demo row is constrained.
    uniqueIndex('workspaces_demo_unique')
      .on(table.demo)
      .where(sql`${table.demo} and ${table.deletedAt} is null`),
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
    // Written once, when an accepted invitation seats the person: the
    // invitation's sender, not `created_by` (that is whoever accepted). Null
    // for a coven's creator.
    invitedBy: uuid('invited_by').references(() => users.id),
    ...auditColumns,
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.userId] })],
);

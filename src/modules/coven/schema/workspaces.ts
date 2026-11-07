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

// Nothing compares two roles (../services/access-control.ts). `owner` is not invitable; `invitations` carries the CHECK.
export const workspaceRole = pgEnum('workspace_role', ['viewer', 'member', 'owner']);

// The demo coven, marked by `demo`, cannot be deleted.
export const workspaces = pgTable(
  'workspaces',
  {
    id: idColumn(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    demo: boolean('demo').notNull().default(false),
    ...auditColumns,
  },
  (table) => [
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
    // Distinct from `created_at`: a role change rewrites the row.
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
    // The invitation's sender, not `created_by` (whoever accepted); null for a coven's creator.
    invitedBy: uuid('invited_by').references(() => users.id),
    ...auditColumns,
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.userId] })],
);

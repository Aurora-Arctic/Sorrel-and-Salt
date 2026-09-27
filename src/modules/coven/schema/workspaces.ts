import { sql } from 'drizzle-orm';
import {
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';
import { users } from './users';

// Declared viewer, member, owner. Nothing compares two roles: each carries its
// own permission statements (src/services/access-control.ts), so the order here
// is documentation. `owner` is not invitable — workspace_invitations carries
// the CHECK.
export const workspaceRole = pgEnum('workspace_role', ['viewer', 'member', 'owner']);

// No `kind` column and no automatic workspace: every workspace takes members
// and is deleted by an owner. Only the URL segment says coven.
export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    ...auditColumns,
  },
  (table) => [
    // Partial per CLAUDE.md rule 4: the slug is what /coven/[slug] routes on.
    uniqueIndex('workspaces_slug_unique')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
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

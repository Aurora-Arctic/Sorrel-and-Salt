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

// DESIGN.md §5's roles, ordered viewer < member < owner — the ordering M6.3's
// assertMembership implements. `owner` is a role but not an invitable one;
// workspace_invitations carries the CHECK that narrows it.
export const workspaceRole = pgEnum('workspace_role', ['viewer', 'member', 'owner']);

// DESIGN.md §5: `id`, `name`, `slug`, + audit — and nothing else. There is no
// `kind` column and no automatically created workspace: every workspace takes
// members and is deleted by an owner. The entity is `workspaces`; only the URL
// segment says coven (§5).
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
    // Partial per CLAUDE.md rule 4 — a plain unique constraint would
    // permanently reserve a soft-deleted workspace's slug, and the slug is
    // what /coven/[slug] routes on.
    uniqueIndex('workspaces_slug_unique')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
  ],
);

// DESIGN.md §5's membership row, keyed on the pair: a surrogate id would let
// the same user join the same workspace twice. M6.3's `assertMembership` reads
// it to decide who may see a workspace's rows.
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
    // Distinct from `created_at`: a membership row can be rewritten (a role
    // change) without changing when the person joined.
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
    ...auditColumns,
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.userId] })],
);

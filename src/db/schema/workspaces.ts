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

// DESIGN.md §5's role table, ordered viewer < member < owner — the ordering
// M6.3's assertMembership implements. `owner` is a role here but deliberately
// not an invitable one; M7.1's check constraint on workspace_invitations is
// where that narrowing lives.
export const workspaceRole = pgEnum('workspace_role', ['viewer', 'member', 'owner']);

// DESIGN.md §5: `id`, `name`, `slug`, + audit — and nothing else. There is no
// `kind` column and no automatically created workspace: every workspace
// behaves identically, taking members and being deleted by an owner. The
// entity is `workspaces` even though its URL prefix is `/coven/` (§5's naming
// note); only the URL segment says coven.
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

// DESIGN.md §5: `workspaceId`, `userId`, `role`, `joinedAt`, + audit, keyed on
// the pair. The composite primary key is the membership's identity — a
// surrogate id would let the same user join the same workspace twice. M6.4's
// RLS policies read this table to decide who may see a workspace's rows.
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

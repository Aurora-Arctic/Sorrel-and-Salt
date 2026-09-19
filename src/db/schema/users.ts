import { sql } from 'drizzle-orm';
import { pgTable, text, boolean, uuid, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';

// DESIGN.md §5: admins curate the compendium and the global vocabularies and
// nothing else — no granular platform permissions, so a column is enough.
export const userRole = pgEnum('user_role', ['user', 'admin']);

// Better Auth's own adapter table (M2.2) plus DESIGN.md §5's app columns
// (M2.3). `name`/`image` keep Better Auth's own names rather than §5's
// displayName/avatarUrl — renaming them would need a `user.fields` mapping in
// src/lib/auth.ts for no benefit, so the design doc was corrected instead.
// `users.created_by` references `users.id`, a genuine self-reference: both the
// sign-up hook and the seed bootstrap satisfy it within one statement
// (claude-docs/db.md, "Audit columns and applyAudit").
export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    role: userRole('role').notNull().default('user'),
    canCreateWorkspace: boolean('can_create_workspace').notNull().default(false),
    ...auditColumns,
  },
  (table) => [
    // Partial per CLAUDE.md rule 4 — a plain unique constraint would
    // permanently reserve a soft-deleted user's email.
    uniqueIndex('users_email_unique')
      .on(table.email)
      .where(sql`${table.deletedAt} is null`),
  ],
);

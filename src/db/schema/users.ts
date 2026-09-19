import { sql } from 'drizzle-orm';
import { pgTable, text, boolean, uuid, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';

// Admins curate the global vocabularies and nothing else, so a column is enough.
export const userRole = pgEnum('user_role', ['user', 'admin']);

// Better Auth's adapter table plus the app columns. `name`/`image` keep Better
// Auth's names (DESIGN.md was corrected, not the fields). `created_by`
// self-references `users.id`; the sign-up hook and seed bootstrap satisfy it
// within one statement (claude-docs/db.md, "Audit columns and applyAudit").
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
    // Partial per CLAUDE.md rule 4.
    uniqueIndex('users_email_unique')
      .on(table.email)
      .where(sql`${table.deletedAt} is null`),
  ],
);

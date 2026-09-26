import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  boolean,
  uuid,
  pgEnum,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
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
    // Better Auth lowercases on every write; this holds a hand-written row to
    // the same, so the unique index above is case-insensitive in effect and at
    // most one live row can match ADMIN_BOOTSTRAP_EMAIL.
    check('users_email_lower_case', sql`${table.email} = lower(${table.email})`),
    // The provisional-account sweep's two halves, the window and the cap, run
    // on every OAuth callback and almost always empty: only unverified rows are
    // in them (claude-docs/auth.md, "Provisional accounts").
    index('users_provisional_updated_at_idx')
      .on(table.updatedAt)
      .where(sql`${table.emailVerified} = false`),
    index('users_provisional_created_at_idx')
      .on(table.createdAt)
      .where(sql`${table.emailVerified} = false`),
  ],
);

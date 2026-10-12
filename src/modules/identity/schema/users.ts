import { sql } from 'drizzle-orm';
import { pgTable, text, boolean, pgEnum, index, check, timestamp } from 'drizzle-orm/pg-core';
import { auditStampColumnsReferencing, deletionColumnsReferencing } from '../../../db/audit';
import type { UsersIdReference } from '../../../db/types';
import { idColumn, liveUnique } from '../../../db/schema-parts';

// The audit column instances every table spreads, built here because each
// references `users.id` — `users` included, so the thunk resolves the table
// below after it exists. Import them from this file, never from db/audit.ts,
// which exports only the factories (claude-docs/db/audit-columns.md, "Audit
// columns and applyAudit").
const usersId: UsersIdReference = () => users.id;
export const auditStampColumns = auditStampColumnsReferencing(usersId);
// The four stamps plus two, spread from the same instance, so the six-column
// set has one definition and the two cannot drift (CLAUDE.md rule 3).
export const auditColumns = { ...auditStampColumns, ...deletionColumnsReferencing(usersId) };

// Admins curate the global vocabularies and nothing else, so a column is enough.
export const userRole = pgEnum('user_role', ['user', 'admin']);

// Better Auth's adapter table plus the app columns. `name`/`image` keep Better
// Auth's names (DESIGN.md was corrected, not the fields). `created_by`
// self-references `users.id`; the sign-up hook and seed bootstrap satisfy it
// within one statement (claude-docs/db/audit-columns.md, "Audit columns and applyAudit").
export const users = pgTable(
  'users',
  {
    id: idColumn(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    role: userRole('role').notNull().default('user'),
    canCreateWorkspace: boolean('can_create_workspace').notNull().default(false),
    // When the last verification mail went out, so the next is a minute away
    // at least; null until the first (claude-docs/auth/admin-bootstrap.md, "The email page").
    verificationSentAt: timestamp('verification_sent_at'),
    ...auditColumns,
  },
  (table) => [
    // Partial per CLAUDE.md rule 4.
    liveUnique('users_email_unique', table, table.email),
    // Better Auth lowercases on every write; this holds a hand-written row to
    // the same, so the unique index above is case-insensitive in effect and at
    // most one live row can match ADMIN_BOOTSTRAP_EMAIL.
    check('users_email_lower_case', sql`${table.email} = lower(${table.email})`),
    // The flag is what lets anyone create a workspace, admins included, so every
    // admin holds it and the gate never reads `role` beside it. Not partial: it
    // states a fact about the row, deleted or not
    // (claude-docs/design-decisions/mb.177-admins-hold-workspace-creation.md).
    check(
      'users_admin_can_create_workspace',
      sql`${table.role} <> 'admin' or ${table.canCreateWorkspace}`,
    ),
    // The provisional-account sweep's two halves, the window and the cap, run
    // on every OAuth callback and almost always empty: only unverified rows are
    // in them (claude-docs/auth/admin-bootstrap.md, "Provisional accounts").
    index('users_provisional_updated_at_idx')
      .on(table.updatedAt)
      .where(sql`${table.emailVerified} = false`),
    index('users_provisional_created_at_idx')
      .on(table.createdAt)
      .where(sql`${table.emailVerified} = false`),
  ],
);

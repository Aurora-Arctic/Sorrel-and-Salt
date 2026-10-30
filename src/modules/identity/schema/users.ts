import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  boolean,
  pgEnum,
  index,
  check,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { auditStampColumnsReferencing, deletionColumnsReferencing } from '../../../db/audit';
import type { UsersIdReference } from '../../../db/types';
import { idColumn, liveUnique } from '../../../db/schema-parts';

// The audit column instances every table spreads, built here because each references `users.id` — `users` included.
// Import them from this file, never from db/audit.ts, which exports only the factories (claude-docs/db/audit-columns.md).
const usersId: UsersIdReference = () => users.id;
export const auditStampColumns = auditStampColumnsReferencing(usersId);
// The four stamps plus two, spread from the same instance, so the six-column
// set has one definition and the two cannot drift (CLAUDE.md rule 3).
export const auditColumns = { ...auditStampColumns, ...deletionColumnsReferencing(usersId) };

// A counter the database adds one to on every UPDATE, through the shared `bump_revision()` trigger each table attaches in its
// own migration. A save names the revision it read and is refused if the row has moved. Named `revision`, not `version`, which v2
// keeps for a saved snapshot (claude-docs/db/grimoire.md, "Revision"; claude-docs/design-decisions/m13.14-autosave.md).
export const revisionColumn = () => integer('revision').notNull().default(1);

// Admins curate the global vocabularies and manage the people page; curators
// curate the same vocabularies and reach no people page. A closed set
// of site roles, so a column is enough.
export const userRole = pgEnum('user_role', ['user', 'curator', 'admin']);

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
    // The `twoFactor` plugin's flag, true once an authenticator is confirmed; the plugin is not registered yet.
    twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
    ...auditColumns,
  },
  (table) => [
    // Partial per CLAUDE.md rule 4.
    liveUnique('users_email_unique', table, table.email),
    // Better Auth lowercases on every write; this holds a hand-written row to
    // the same, so the unique index above is case-insensitive in effect and at
    // most one live row can match ADMIN_BOOTSTRAP_EMAIL.
    check('users_email_lower_case', sql`${table.email} = lower(${table.email})`),
    // The flag lets anyone create a workspace, so every role but `user` holds it and the gate never reads `role` beside it.
    // Not partial: it states a fact about the row, deleted or not (claude-docs/design-decisions/mb.177-admins-hold-workspace-creation.md).
    // It names `user`, not the privileged roles, so the migration adding `curator` need not use the new value it adds.
    check(
      'users_privileged_can_create_workspace',
      sql`${table.role} = 'user' or ${table.canCreateWorkspace}`,
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

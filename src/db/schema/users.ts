import { sql } from 'drizzle-orm';
import { pgTable, text, boolean, uuid, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
import { auditColumns } from '../audit';

// DESIGN.md §5: admins curate the compendium and global categories, and
// nothing else — no granular platform permissions, so a column is enough.
export const userRole = pgEnum('user_role', ['user', 'admin']);

// Better Auth's own adapter table (M2.2) plus DESIGN.md §5's app columns
// (M2.3): role/canCreateWorkspace. `name`/`image` stay Better Auth's own
// names rather than DESIGN.md §5's displayName/avatarUrl — renaming them
// would need a `user.fields` mapping in src/lib/auth.ts for no real
// benefit, so the design doc was corrected to match instead. `auditColumns`
// is spread per CLAUDE.md rule 3; its `*_by` columns reference `users.id`
// (src/db/audit.ts, MB.5) including here, where that's a self-reference —
// `users` is its own FK target. src/lib/auth.ts's `databaseHooks` stamps
// createdBy/updatedBy with the new user's own id on sign-up, the same
// self-satisfying pattern MB.5 documents for the seed bootstrap user.
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

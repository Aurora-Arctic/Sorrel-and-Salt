import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';

// Better Auth's own adapter table (M2.2) — id, name, email, emailVerified,
// image, createdAt, updatedAt. M2.3 adds role/canCreateWorkspace and renames
// name/image to displayName/avatarUrl per DESIGN.md §5; MB.5 adds the
// auditColumns self-reference once every column exists.
export const users = pgTable('users', {
  id: uuid('id')
    .default(sql`pg_catalog.gen_random_uuid()`)
    .primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

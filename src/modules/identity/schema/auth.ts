import { bigint, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';
import { idColumn } from '../../../db/schema-parts';

// Better Auth's own adapter tables, generated with `usePlural: true` and
// `generateId: 'uuid'` (src/lib/auth.ts); `users` lives in ./users.ts.
// No audit columns and nothing writes them through `withAudit`, so the
// `updated_at` trigger skips them. `sessions.impersonated_by` is the `admin`
// plugin's column, not an audit id.

export const sessions = pgTable(
  'sessions',
  {
    id: idColumn(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // The admin acting as `user_id`, on an impersonation session alone; the
    // `admin` plugin's column, registered outside production only (MB.53).
    impersonatedBy: uuid('impersonated_by').references(() => users.id),
  },
  (table) => [index('sessions_userId_idx').on(table.userId)],
);

// `password` stays null in v1 — OAuth only. The column is Better Auth's own,
// and keeping it means email+password needs no migration later.
export const accounts = pgTable(
  'accounts',
  {
    id: idColumn(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('accounts_userId_idx').on(table.userId)],
);

export const verifications = pgTable(
  'verifications',
  {
    id: idColumn(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
);

// Written and pruned by Better Auth's limiter alone, so it carries no
// `updated_at` either. `last_request` is epoch milliseconds, which outgrows an
// integer; `mode: 'number'` hands Better Auth the number it compares.
export const rateLimits = pgTable('rate_limits', {
  id: idColumn(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
});

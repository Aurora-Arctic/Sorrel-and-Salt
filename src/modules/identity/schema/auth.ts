import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { idColumn } from '../../../db/schema-parts';

// Better Auth's own adapter tables, generated with `usePlural: true` and `generateId: 'uuid'` (src/lib/auth.ts); `users` is in ./users.ts.
// No audit columns, so the `updated_at` trigger skips them. `sessions.impersonated_by` is the `admin` plugin's column, not an audit id.

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
    // `admin` plugin's column, registered outside production only.
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

// One row per account with a failed password sign-in, and none otherwise. No
// audit columns: nobody writes it by hand and a failed sign-in has no session.
// `locked_until` is the end of a timed lock; the schedule that sets it is the
// lockout's, not the table's.
export const signInFailures = pgTable('sign_in_failures', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  count: integer('count').notNull().default(0),
  firstFailedAt: timestamp('first_failed_at').defaultNow().notNull(),
  lockedUntil: timestamp('locked_until'),
});

// The `passkey` plugin's model, named `passkeys` by `usePlural`; the plugin is not registered yet. Its field `credentialID` is `credentialId`
// here, and its `schema` option maps one to the other when the plugin is registered.
export const passkeys = pgTable(
  'passkeys',
  {
    id: idColumn(),
    name: text('name'),
    publicKey: text('public_key').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    credentialId: text('credential_id').notNull(),
    counter: integer('counter').notNull(),
    deviceType: text('device_type').notNull(),
    backedUp: boolean('backed_up').notNull(),
    transports: text('transports'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    aaguid: text('aaguid'),
  },
  (table) => [
    index('passkeys_userId_idx').on(table.userId),
    uniqueIndex('passkeys_credentialId_idx').on(table.credentialId),
  ],
);

// The `twoFactor` plugin's model, named `two_factors` by `usePlural`; the plugin is not registered yet. `secret` and `backup_codes` hold the
// plugin's encrypted text. The last three columns are its lockout after repeated wrong codes: the count, and until when the account is refused.
export const twoFactors = pgTable(
  'two_factors',
  {
    id: idColumn(),
    secret: text('secret').notNull(),
    backupCodes: text('backup_codes').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    verified: boolean('verified').default(true).notNull(),
    failedVerificationCount: integer('failed_verification_count').default(0).notNull(),
    lockedUntil: timestamp('locked_until'),
  },
  (table) => [index('two_factors_userId_idx').on(table.userId)],
);

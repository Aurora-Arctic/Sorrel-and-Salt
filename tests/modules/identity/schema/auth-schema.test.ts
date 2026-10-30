import { describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import type { BetterAuthOptions } from 'better-auth';
import type { DBAdapter } from '@better-auth/core/db/adapter';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { tableFacts } from '../../../support/db/table-metadata';
import { rateLimits, signInFailures } from '@/modules/identity/schema/auth';
import { warmImport } from '../../../support/warm-import';

warmImport(() => import('@/lib/auth'));

// Better Auth's `rateLimit` model for `storage: 'database'`: `key` unique,
// `count`, and `lastRequest` a bigint of epoch milliseconds, which outgrows an
// integer (claude-docs/auth/tables.md, "Tables").
describe('rate_limits schema', () => {
  const { columns } = tableFacts(rateLimits);

  // No audit column: Better Auth writes and prunes it alone.
  it('has id, key, count and last_request, and nothing else', () => {
    expect(columns.map((column) => column.name).sort()).toEqual([
      'count',
      'id',
      'key',
      'last_request',
    ]);
  });
});

describe('rate_limits in the migrated database', () => {
  let sql: postgres.Sql;
  useTestDatabase((client) => {
    sql = client;
  });

  it('refuses a second row for the same key', async () => {
    await sql`insert into rate_limits (key, count, last_request) values ('127.0.0.1|/twice', 1, 0)`;

    const error = await failureOf(
      sql`insert into rate_limits (key, count, last_request) values ('127.0.0.1|/twice', 1, 0)`,
    );

    expect(error.code).toBe('23505');
    expect(error.constraint_name).toBe('rate_limits_key_unique');
  });

  it('stores a millisecond clock past the integer range', async () => {
    const now = Date.UTC(2026, 8, 27);
    // Why an integer column would have failed here: the value does not fit one.
    expect(now).toBeGreaterThan(2 ** 31 - 1);

    await sql`insert into rate_limits (key, count, last_request) values ('127.0.0.1|/clock', 1, ${now})`;
    const [row] = await sql<{ last_request: string }[]>`
      select last_request from rate_limits where key = '127.0.0.1|/clock'
    `;

    expect(Number(row.last_request)).toBe(now);
  });
});

// The table is only Better Auth's if its adapter can find it: the schema passed to `drizzleAdapter` in src/lib/auth.ts must name it under the pluralised model key.
// `storage: 'database'` is what makes Better Auth ask for the model at all, so it is set here rather than in the config.
describe("rate_limits through Better Auth's adapter", () => {
  let sql: postgres.Sql;
  useTestDatabase((client) => {
    sql = client;
  });

  async function rateLimitAdapter(): Promise<DBAdapter> {
    vi.resetModules();
    const { auth } = await import('@/lib/auth');
    const options: BetterAuthOptions = { ...auth.options, rateLimit: { storage: 'database' } };
    return auth.options.database(options);
  }

  it('writes a rateLimit row into rate_limits and reads it back', async () => {
    const adapter = await rateLimitAdapter();
    const key = '203.0.113.7|/sign-in/social';
    const lastRequest = Date.UTC(2026, 8, 27, 12);

    await adapter.create({ model: 'rateLimit', data: { key, count: 1, lastRequest } });

    const [row] = await sql<{ count: number; last_request: string }[]>`
      select count, last_request from rate_limits where key = ${key}
    `;
    expect(row).toEqual({ count: 1, last_request: String(lastRequest) });

    const found = await adapter.findOne<{ key: string; count: number; lastRequest: number }>({
      model: 'rateLimit',
      where: [{ field: 'key', value: key }],
    });
    expect(found).toMatchObject({ key, count: 1, lastRequest });
  });
});

// The per-account counter behind the password lockout: one row an account, gone with the account.
describe('sign_in_failures schema', () => {
  const { columns, byName, foreignKeyByColumn } = tableFacts(signInFailures);

  // No audit column: a failed sign-in has no session to take one from.
  it('has the counter columns and nothing else', () => {
    expect(columns.map((column) => column.name).sort()).toEqual([
      'count',
      'first_failed_at',
      'locked_until',
      'password_disabled',
      'user_id',
    ]);
  });

  it('keys on the account, deleting with it', () => {
    expect(byName.user_id.primary).toBe(true);
    expect(foreignKeyByColumn.user_id).toMatchObject({ foreignTable: expect.anything() });
    expect(foreignKeyByColumn.user_id.foreignColumnNames).toEqual(['id']);
    expect(signInFailures.userId.notNull).toBe(true);
  });

  it('starts at zero and enabled, with no lock', () => {
    expect(byName.count.default).toBe(0);
    expect(byName.password_disabled.default).toBe(false);
    expect(byName.locked_until.notNull).toBe(false);
  });
});

describe('sign_in_failures in the migrated database', () => {
  let sql: postgres.Sql;
  useTestDatabase((client) => {
    sql = client;
  });

  it('cascades from users on delete', async () => {
    const [{ delete_rule: rule }] = await sql<{ delete_rule: string }[]>`
      select delete_rule from information_schema.referential_constraints
      where constraint_name = 'sign_in_failures_user_id_users_id_fk'
    `;
    expect(rule).toBe('CASCADE');
  });
});

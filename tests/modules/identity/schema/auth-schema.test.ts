import { describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import type { BetterAuthOptions } from 'better-auth';
import type { DBAdapter } from '@better-auth/core/db/adapter';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { tableFacts } from '../../../support/db/table-metadata';
import { rateLimits } from '@/modules/identity/schema/auth';
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

// The table is only Better Auth's if its adapter can find it: the schema passed
// to `drizzleAdapter` in src/lib/auth.ts must name it under the pluralised
// model key. `storage: 'database'` is what makes Better Auth ask for the model
// at all, so it is set here rather than in the config it is not yet on in.
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

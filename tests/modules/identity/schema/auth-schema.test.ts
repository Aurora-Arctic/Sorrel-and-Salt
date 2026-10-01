import { describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import type { BetterAuthOptions } from 'better-auth';
import type { DBAdapter } from '@better-auth/core/db/adapter';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { rateLimits } from '@/modules/identity/schema/auth';

// Better Auth's `rateLimit` model for `storage: 'database'`: `key` unique,
// `count`, and `lastRequest` a bigint of epoch milliseconds, which outgrows an
// integer (claude-docs/auth/tables.md, "Tables").
describe('rate_limits schema', () => {
  const { byName, columns } = tableFacts(rateLimits);

  it('has id, key, count and last_request, and nothing else', () => {
    expect(columns.map((column) => column.name).sort()).toEqual([
      'count',
      'id',
      'key',
      'last_request',
    ]);
  });

  it('keys on a unique, not-null text key', () => {
    expect(byName.key.columnType).toBe('PgText');
    expect(byName.key.notNull).toBe(true);
    expect(byName.key.isUnique).toBe(true);
  });

  it('counts in a not-null integer', () => {
    expect(byName.count.columnType).toBe('PgInteger');
    expect(byName.count.notNull).toBe(true);
  });

  it('holds last_request as a not-null bigint read as a number', () => {
    expect(byName.last_request.columnType).toBe('PgBigInt53');
    expect(byName.last_request.notNull).toBe(true);
  });

  it('carries no audit column — Better Auth writes and prunes it alone', () => {
    for (const column of AUDIT_COLUMNS) {
      expect(byName[column]).toBeUndefined();
    }
  });
});

describe('rate_limits in the migrated database', () => {
  let sql: postgres.Sql;
  const catalogue = useTestDatabase((client) => {
    sql = client;
  });

  it('has the four columns with the types Better Auth writes', async () => {
    const rows = await sql<{ column_name: string; data_type: string; is_nullable: string }[]>`
      select column_name, data_type, is_nullable from information_schema.columns
      where table_schema = 'public' and table_name = 'rate_limits'
      order by column_name
    `;

    expect(rows).toEqual([
      { column_name: 'count', data_type: 'integer', is_nullable: 'NO' },
      { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
      { column_name: 'key', data_type: 'text', is_nullable: 'NO' },
      { column_name: 'last_request', data_type: 'bigint', is_nullable: 'NO' },
    ]);
  });

  it('holds key unique, as a plain constraint rather than a partial index', async () => {
    const index = await catalogue.indexRow('rate_limits', 'rate_limits_key_unique');

    expect(index?.unique).toBe(true);
    expect(index?.predicate).toBeNull();
    expect(index?.definition).toMatch(/USING btree \(key\)/);
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

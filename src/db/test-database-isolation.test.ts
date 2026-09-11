import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
// M1.17: the connection itself is this test's subject — it asserts which
// database db points at.
// oxlint-disable-next-line no-restricted-imports
import { db } from './connection';

// Exercises M1.9's globalSetup wiring: db-setup.ts points this worker's
// DATABASE_URL at the sorrel_test_<n> clone db-global-setup.ts made for it.
describe('per-worker test database', () => {
  it('connects to a database named for this worker, not sorrel or sorrel_template', async () => {
    const [{ current_database: name }] = await db.execute<{ current_database: string }>(
      'select current_database()',
    );
    expect(name).toBe(`sorrel_test_${process.env.VITEST_WORKER_ID}`);
  });

  it('has no migrations table, since setup clones rather than migrates', async () => {
    const [{ exists }] = await db.execute<{ exists: boolean }>(
      "select exists (select 1 from information_schema.tables where table_name = '__drizzle_migrations') as exists",
    );
    expect(exists).toBe(false);
  });

  it('is a real, writable database distinct from a crashed run leftover', async () => {
    const sql = postgres(process.env.DATABASE_URL as string);
    await sql`create table if not exists isolation_probe (id int)`;
    await sql`insert into isolation_probe (id) values (1)`;
    const rows = await sql`select id from isolation_probe`;
    expect(rows).toHaveLength(1);
    await sql`drop table isolation_probe`;
    await sql.end();
  });
});

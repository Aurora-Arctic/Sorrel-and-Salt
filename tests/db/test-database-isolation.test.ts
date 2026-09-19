import { describe, expect, inject, it } from 'vitest';
import postgres from 'postgres';
// The connection itself is this test's subject: which database `db` points at.
// oxlint-disable-next-line no-restricted-imports
import { db } from '@/db/connection';

// db-setup.ts points this worker's DATABASE_URL at the clone made for its pool slot.
describe('per-worker test database', () => {
  it('connects to a database named for this worker, not sorrel or sorrel_template', async () => {
    const [{ current_database: name }] = await db.execute<{ current_database: string }>(
      'select current_database()',
    );
    expect(name).toBe(`sorrel_test_${process.env.VITEST_POOL_ID}`);
  });

  // The derived name must be one globalSetup actually cloned: `workerDatabases`
  // is the list it made, so this compares against the real thing rather than
  // recomputing the bound and agreeing with itself.
  it('connects to one of the databases globalSetup actually created', async () => {
    const [{ current_database: name }] = await db.execute<{ current_database: string }>(
      'select current_database()',
    );
    expect(inject('workerDatabases')).toContain(name);
  });

  it('has the migrations journal, since the template it was cloned from was migrated', async () => {
    const [{ exists }] = await db.execute<{ exists: boolean }>(
      "select exists (select 1 from information_schema.tables where table_schema = 'drizzle' and table_name = '__drizzle_migrations') as exists",
    );
    expect(exists).toBe(true);
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

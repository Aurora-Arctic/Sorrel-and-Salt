import { describe, expect, inject, it } from 'vitest';
import postgres from 'postgres';
// M1.17: the connection itself is this test's subject — it asserts which
// database db points at.
// oxlint-disable-next-line no-restricted-imports
import { db } from '@/db/connection';

// Exercises M1.9's globalSetup wiring: db-setup.ts points this worker's
// DATABASE_URL at the sorrel_test_<n> clone db-global-setup.ts made for its
// pool slot.
describe('per-worker test database', () => {
  it('connects to a database named for this worker, not sorrel or sorrel_template', async () => {
    const [{ current_database: name }] = await db.execute<{ current_database: string }>(
      'select current_database()',
    );
    expect(name).toBe(`sorrel_test_${process.env.VITEST_POOL_ID}`);
  });

  // MB.14: the name a worker derives has to be a name globalSetup actually
  // cloned. Asserting the shape alone passed happily while the two halves
  // indexed different things — slot vs. test-file counter — and CI failed on
  // a `sorrel_test_4` that was never created. `workerDatabases` is the list
  // globalSetup made, so this compares against the real thing rather than
  // recomputing the bound and agreeing with itself.
  it('connects to one of the databases globalSetup actually created', async () => {
    const [{ current_database: name }] = await db.execute<{ current_database: string }>(
      'select current_database()',
    );
    expect(inject('workerDatabases')).toContain(name);
  });

  // The clone is made from a template globalSetup migrated and seeded, so
  // drizzle-kit's journal is in it.
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

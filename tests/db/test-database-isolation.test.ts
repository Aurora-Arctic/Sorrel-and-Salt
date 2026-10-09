import { describe, expect, it } from 'vitest';
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

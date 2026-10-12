import { describe, expect, it } from 'vitest';
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
});

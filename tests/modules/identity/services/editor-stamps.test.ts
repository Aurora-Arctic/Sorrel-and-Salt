import type postgres from 'postgres';
import { describe, expect, it } from 'vitest';
import { editorStamps } from '@/app/(shell)/admin/editors';
import { Forbidden } from '@/lib/errors';
import { A, B, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';

// Regression: every admin curated list stamped its rows through a read only
// a site admin could make, so a curator opening /admin/compendium
// got a 500. The stamps are called as the pages call them, against the
// seeded users, for each role that may open a curation screen.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const AT = new Date('2026-05-06T10:00:00Z');
const ROWS = [
  { updatedBy: B.id, updatedAt: AT },
  { updatedBy: A.id, updatedAt: AT },
];

describe('editorStamps', () => {
  it('is given rows last edited by real users, so an empty batch cannot pass it', async () => {
    expect(ROWS.length).toBeGreaterThan(0);
    const [found] =
      await sql`select count(*)::int as n from users where id in ${sql(ROWS.map((r) => r.updatedBy))} and deleted_at is null`;
    expect(found.n).toBe(ROWS.length);
  });

  it('names each row’s editor for a curator', async () => {
    expect(asUser(F).role).toBe('curator');
    expect(await editorStamps(asUser(F), ROWS)).toEqual([
      { updatedBy: B.name, updatedAt: AT },
      { updatedBy: A.name, updatedAt: AT },
    ]);
  });

  it('refuses a session that curates nothing', async () => {
    expect(asUser(A).role).toBe('user');
    await expect(editorStamps(asUser(A), ROWS)).rejects.toThrow(Forbidden);
  });
});

import { describe, expect, it } from 'vitest';
import { editorStamps } from '@/app/(shell)/admin/editors';
import { Forbidden } from '@/lib/errors';
import { A, B, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';

// Regression: every admin curated list stamped its rows through a read only
// a site admin could make, so a curator (M11.20) opening /admin/compendium
// got a 500. The stamps are called as the pages call them, against the
// seeded users, for each role that may open a curation screen.

useTestDatabase(() => {});

const AT = new Date('2026-05-06T10:00:00Z');
const ROWS = [
  { updatedBy: B.id, updatedAt: AT },
  { updatedBy: A.id, updatedAt: AT },
];

describe('editorStamps', () => {
  it('names each row’s editor for a curator', async () => {
    expect(asUser(F).role).toBe('curator');
    expect(await editorStamps(asUser(F), ROWS)).toEqual([
      { updatedBy: B.name, updatedAt: AT },
      { updatedBy: A.name, updatedAt: AT },
    ]);
  });

  it('names each row’s editor for an admin', async () => {
    expect(asUser(E).role).toBe('admin');
    expect(await editorStamps(asUser(E), ROWS)).toEqual([
      { updatedBy: B.name, updatedAt: AT },
      { updatedBy: A.name, updatedAt: AT },
    ]);
  });

  it('refuses a session that curates nothing', async () => {
    expect(asUser(A).role).toBe('user');
    await expect(editorStamps(asUser(A), ROWS)).rejects.toThrow(Forbidden);
  });
});

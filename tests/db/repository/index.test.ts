import { describe, expect, it, vi } from 'vitest';
import { getTableColumns } from 'drizzle-orm';

// The repository's exported surface is pinned once, by
// tests/guards/soft-delete-finder-guard.test.ts off the index's text (MB.184).

// `audit.ts` takes the column its stamps reference rather than importing
// `users`, so no import order leaves `users` half-built (claude-docs/db/seed-module.md,
// "The seed module"). A service's first database import is the repository, so
// this pins that entering there builds `users` with its audit columns. Were the
// cycle back, loading the repository here throws: one half reads the other
// before it is initialised.
describe('entering the database layer through the repository', () => {
  it('builds users with its audit columns', async () => {
    vi.resetModules();
    await import('@/db/repository');
    const { users: freshUsers } = await import('@/modules/identity/schema/users');

    expect(Object.keys(getTableColumns(freshUsers))).toEqual(
      expect.arrayContaining(['createdBy', 'updatedBy', 'deletedAt']),
    );
  });
});

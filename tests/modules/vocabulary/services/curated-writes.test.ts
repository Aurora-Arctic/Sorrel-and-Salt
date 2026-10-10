import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { ValidationError } from '@/lib/errors';
import { createCategory } from '@/modules/vocabulary';
import { E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';

// The slug refusal every curated vocabulary's write shares (MB.210), on the
// two arms its services' tests cannot reach without a race: an error that is
// not the vocabulary's slug violation, and a violation whose holder is gone
// by the time the refusal reads it. Reached through `createCategory`, whose
// write is stubbed to fail as each race would leave it; the holder-named arm
// is each service's own test.

const repository = vi.hoisted(() => ({ withAudit: vi.fn() }));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.withAudit.mockImplementation(actual.withAudit);
  return { ...actual, ...repository };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let groupId: string;
beforeAll(async () => {
  const [row] = await sql<{ id: string }[]>`
    select id from category_groups where deleted_at is null order by name, id limit 1`;
  groupId = row.id;
});

beforeEach(() => {
  repository.withAudit.mockReset();
});

/** A driver error as Postgres reports a unique violation, wrapped as Drizzle wraps one. */
function violation(index: string): Error {
  const cause = Object.assign(new Error('duplicate key'), {
    code: '23505',
    constraint_name: index,
  });
  return Object.assign(new Error('Failed query'), { cause });
}

const write = (name: string) =>
  createCategory(asUser(E), { name, description: 'A category this test made', groupId });

describe('refuseSlugCollision', () => {
  it('rethrows any error but its own slug violation untouched', async () => {
    const other = violation('category_groups_slug_unique');
    const plain = new Error('connection reset');
    repository.withAudit.mockRejectedValueOnce(other).mockRejectedValueOnce(plain);

    await expect(write('Testcraft Other')).rejects.toBe(other);
    await expect(write('Testcraft Plain')).rejects.toBe(plain);
  });

  it('refuses its own violation on `name` when no live row holds the address any longer', async () => {
    repository.withAudit.mockRejectedValueOnce(violation('categories_slug_unique'));
    // The precondition: no row holds the address, so the refusal can name no holder.
    const [{ count }] = await sql<{ count: number }[]>`
      select count(*)::int as count from categories where slug = 'testcraft-nobody'`;
    expect(count).toBe(0);

    const refused = await write('Testcraft Nobody').catch((error: unknown) => error);

    expect(refused).toBeInstanceOf(ValidationError);
    expect((refused as ValidationError).issues.map((issue) => issue.path)).toEqual([['name']]);
    expect((refused as ValidationError).issues[0].message).toContain('"testcraft-nobody"');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../../../support/db/database';
import { buildLoaders } from '@/graphql/loaders';
import { NotFound } from '@/lib/errors';
import { categoryGroupsById } from '@/modules/vocabulary';

const repository = vi.hoisted(() => ({ findManyByIds: vi.fn(), findWorkspaceSeat: vi.fn() }));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findManyByIds.mockImplementation(actual.findManyByIds);
  repository.findWorkspaceSeat.mockImplementation(actual.findWorkspaceSeat);
  return { ...actual, ...repository };
});

const ABSENT = '99999999-9999-9999-9999-999999999999';
const LOADERS = { categoryGroupsById };

let sql: ReturnType<typeof postgres>;

useTestDatabase((client) => (sql = client));

beforeEach(() => {
  repository.findManyByIds.mockClear();
  repository.findWorkspaceSeat.mockClear();
});

async function seededIds(table: 'category_groups' | 'ingredient_form_groups'): Promise<string[]> {
  const rows = await sql`select id from ${sql(table)} where deleted_at is null order by name`;
  return rows.map((row) => row.id as string);
}

describe('the categoryGroupsById loader', () => {
  const name = 'categoryGroupsById' as const;
  const table = 'category_groups' as const;

  it('answers a batch of keys, repeats included, with one read and no role lookup', async () => {
    const ids = await seededIds(table);
    const loader = buildLoaders(LOADERS, null)[name];

    const answers = await Promise.allSettled([...ids, ids[0], ABSENT].map((id) => loader.load(id)));

    expect(answers.slice(0, ids.length + 1).map((answer) => answer.status)).not.toContain(
      'rejected',
    );
    expect(answers[answers.length - 1]).toMatchObject({
      status: 'rejected',
      reason: expect.any(NotFound),
    });
    expect(repository.findManyByIds).toHaveBeenCalledTimes(1);
    expect(repository.findWorkspaceSeat).not.toHaveBeenCalled();
  });
});

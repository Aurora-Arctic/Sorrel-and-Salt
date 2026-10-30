import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../../../support/db/database';
import { buildLoaders } from '@/graphql/loaders';
import { NotFound } from '@/lib/errors';
import { categoryGroupsById } from '@/modules/vocabulary';

// The query count, observed at the repository: the one read each batch makes
// is wrapped so the test counts calls without changing what they answer, and
// the role lookup is wrapped to show a public read never makes one.
const repository = vi.hoisted(() => ({ findManyByIds: vi.fn(), findWorkspaceRole: vi.fn() }));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findManyByIds.mockImplementation(actual.findManyByIds);
  repository.findWorkspaceRole.mockImplementation(actual.findWorkspaceRole);
  return { ...actual, ...repository };
});

const ABSENT = '99999999-9999-9999-9999-999999999999';
const LOADERS = { categoryGroupsById };

let sql: ReturnType<typeof postgres>;

useTestDatabase((client) => (sql = client));

beforeEach(() => {
  repository.findManyByIds.mockClear();
  repository.findWorkspaceRole.mockClear();
});

async function seededIds(table: 'category_groups' | 'ingredient_form_groups'): Promise<string[]> {
  const rows = await sql`select id from ${sql(table)} where deleted_at is null order by name`;
  return rows.map((row) => row.id as string);
}

// `ingredientFormGroupsById` is built by the same helper as `categoryGroupsById`, so
// only the latter runs; a loader's per-request cache is tests/graphql/loaders's.
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
    expect(repository.findWorkspaceRole).not.toHaveBeenCalled();
  });
});

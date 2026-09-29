import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { buildLoaders } from '@/graphql/loaders';
import { NotFound } from '@/lib/errors';
import { categoryGroupsById, ingredientFormGroupsById } from '@/modules/vocabulary';

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
const LOADERS = { categoryGroupsById, ingredientFormGroupsById };

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(() => {
  repository.findManyByIds.mockClear();
  repository.findWorkspaceRole.mockClear();
});

async function seededIds(table: 'category_groups' | 'ingredient_form_groups'): Promise<string[]> {
  const rows = await sql`select id from ${sql(table)} where deleted_at is null order by name`;
  return rows.map((row) => row.id as string);
}

describe.each([
  { name: 'categoryGroupsById' as const, table: 'category_groups' as const },
  { name: 'ingredientFormGroupsById' as const, table: 'ingredient_form_groups' as const },
])('the $name loader', ({ name, table }) => {
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

  it('caches nothing across requests: a second set of loaders reads again', async () => {
    const [id] = await seededIds(table);
    await buildLoaders(LOADERS, null)[name].load(id);

    await buildLoaders(LOADERS, null)[name].load(id);

    expect(repository.findManyByIds).toHaveBeenCalledTimes(2);
  });
});

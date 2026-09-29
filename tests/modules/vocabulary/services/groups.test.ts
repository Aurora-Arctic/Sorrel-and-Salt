import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { NotFound } from '@/lib/errors';
import { categoryGroupsOf, formGroupsOf } from '@/modules/vocabulary';
import { A } from '../../../support/as-user';

// The two group lookups behind `Category.group` and `IngredientFormValue.group`:
// public reference data, answered in key order with a `NotFound` in the slot
// of a group that is missing or retired, so a loader rejects that key alone.

const repository = vi.hoisted(() => ({ findManyByIds: vi.fn() }));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findManyByIds.mockImplementation(actual.findManyByIds);
  return { ...actual, ...repository };
});

const ABSENT = '99999999-9999-9999-9999-999999999999';

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(() => {
  repository.findManyByIds.mockClear();
});

// The seed is shared by every test in this file, so each undoes its own tombstones.
afterEach(async () => {
  await sql`update category_groups set deleted_at = null, deleted_by = null`;
  await sql`update ingredient_form_groups set deleted_at = null, deleted_by = null`;
});

async function seededIds(table: 'category_groups' | 'ingredient_form_groups'): Promise<string[]> {
  const rows = await sql`select id from ${sql(table)} where deleted_at is null order by name`;
  return rows.map((row) => row.id as string);
}

describe.each([
  { name: 'categoryGroupsOf', table: 'category_groups' as const, groupsOf: categoryGroupsOf },
  { name: 'formGroupsOf', table: 'ingredient_form_groups' as const, groupsOf: formGroupsOf },
])('$name', ({ table, groupsOf }) => {
  it('answers each id in the order asked, with one read for the batch', async () => {
    const [first, second] = await seededIds(table);

    const answers = await groupsOf([second, first, second]);

    expect(answers.map((answer) => (answer instanceof Error ? answer : answer.id))).toEqual([
      second,
      first,
      second,
    ]);
    expect(repository.findManyByIds).toHaveBeenCalledTimes(1);
  });

  it('answers NotFound in the slot of an id no live group carries', async () => {
    const [first] = await seededIds(table);

    const answers = await groupsOf([ABSENT, first]);

    expect(answers[0]).toBeInstanceOf(NotFound);
    expect(answers[1]).toMatchObject({ id: first });
  });

  it('answers NotFound for a retired group', async () => {
    const [first, second] = await seededIds(table);
    // The precondition: live, the group answers.
    expect((await groupsOf([first]))[0]).toMatchObject({ id: first });
    await sql`
      update ${sql(table)} set deleted_at = now(), deleted_by = ${A.id} where id = ${first}`;

    const answers = await groupsOf([first, second]);

    expect(answers[0]).toBeInstanceOf(NotFound);
    expect(answers[1]).toMatchObject({ id: second });
  });

  it('answers an empty batch with nothing', async () => {
    await expect(groupsOf([])).resolves.toEqual([]);
  });
});

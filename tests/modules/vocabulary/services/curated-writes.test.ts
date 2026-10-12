import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { ValidationError } from '@/lib/errors';
import { createCategory, deleteIngredientFormGroup } from '@/modules/vocabulary';
import { E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';

// The slug refusal every curated vocabulary's write shares (MB.210), on the
// two arms its services' tests cannot reach without a race: an error that is
// not the vocabulary's slug violation, and a violation whose holder is gone
// by the time the refusal reads it. Reached through `createCategory`, whose
// write is stubbed to fail as each race would leave it; the holder-named arm
// is each service's own test. A group's delete, likewise, when the slug index
// refuses a move the read before the write let through.

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

describe('deleteGroup', () => {
  /** A live form group holding live forms, and another live group to move them to. */
  async function groupAndTarget(): Promise<{ id: string; moveTo: string }> {
    const [held] = await sql<{ id: string }[]>`
      select g.id from ingredient_form_groups g
      where g.deleted_at is null
        and exists (select 1 from ingredient_forms f where f.group_id = g.id and f.deleted_at is null)
      order by g.name, g.id limit 1`;
    const [other] = await sql<{ id: string }[]>`
      select id from ingredient_form_groups
      where deleted_at is null and id <> ${held.id} order by name, id limit 1`;
    return { id: held.id, moveTo: other.id };
  }

  it('refuses on `moveTo`, in general terms, a move the slug index refused and the second read cannot place', async () => {
    const { id, moveTo } = await groupAndTarget();
    repository.withAudit.mockRejectedValueOnce(violation('ingredient_forms_slug_unique'));

    const refused = await deleteIngredientFormGroup(asUser(E), id, moveTo).catch(
      (error: unknown) => error,
    );

    expect(refused).toBeInstanceOf(ValidationError);
    expect((refused as ValidationError).issues.map((issue) => issue.path)).toEqual([['moveTo']]);
  });

  it('rethrows any other failure of the write untouched', async () => {
    const { id, moveTo } = await groupAndTarget();
    const plain = new Error('connection reset');
    repository.withAudit.mockRejectedValueOnce(plain);

    await expect(deleteIngredientFormGroup(asUser(E), id, moveTo)).rejects.toBe(plain);
  });
});

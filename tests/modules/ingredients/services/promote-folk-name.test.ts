import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, NotFound, ValidationError } from '@/lib/errors';
import { ingredientSlug } from '@/lib/slugify';
import { promoteFolkName } from '@/modules/ingredients';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { type IngredientFixture, makeIngredient } from '../../../support/fixtures';

// M8.3a: swapping an ingredient's display name with one of its folk names, in
// one write. The table is emptied per test, so every row read back is one this
// file wrote.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  await sql`truncate retired_ingredient_slugs`;
});

const fixture = (overrides: Partial<IngredientFixture>) =>
  insertIngredient(sql, makeIngredient(overrides), A.id);

/** A coven's ingredient: with a formal name it is botanical, without it declares none. */
const local = (overrides: Partial<IngredientFixture> = {}, workspaceId = WORKSPACE_W_ID) =>
  fixture({
    workspaceId,
    nomenclature: overrides.canonicalName ? 'botanical' : 'none',
    ...overrides,
  });

const compendium = (overrides: Partial<IngredientFixture> = {}) =>
  fixture({
    workspaceId: null,
    nomenclature: overrides.canonicalName ? 'botanical' : 'none',
    ...overrides,
  });

async function rowOf(id: string) {
  const [row] = await sql`select * from ingredients where id = ${id}`;
  return row;
}

const folkNames = (ingredientId: string) =>
  sql`select id, name, deleted_at from ingredient_folk_names where ingredient_id = ${ingredientId} order by name`;

const liveNames = async (ingredientId: string) =>
  (await folkNames(ingredientId)).filter((r) => r.deleted_at === null).map((r) => r.name as string);

async function folkIdOf(ingredientId: string, name: string) {
  const [row] = await sql`
    select id from ingredient_folk_names
    where ingredient_id = ${ingredientId} and name = ${name} and deleted_at is null`;
  return row.id as string;
}

describe('promoteFolkName — the swap', () => {
  it('makes the folk name the display name and the old display name a folk name, once', async () => {
    const id = await local({
      name: 'Fixture Herb',
      canonicalName: 'Fixtura testalis',
      folkNames: ['Testwort', 'Other Wort'],
    });

    const row = await promoteFolkName(
      asUser(A),
      WORKSPACE_W_ID,
      id,
      await folkIdOf(id, 'Testwort'),
    );

    expect(row.name).toBe('Testwort');
    expect((await rowOf(id)).name).toBe('Testwort');
    expect(await liveNames(id)).toEqual(['Fixture Herb', 'Other Wort']);
  });

  it('writes the swap in one transaction', async () => {
    const id = await local({
      name: 'Fixture Herb',
      canonicalName: 'Fixtura testalis',
      folkNames: ['Testwort'],
    });

    await promoteFolkName(asUser(A), WORKSPACE_W_ID, id, await folkIdOf(id, 'Testwort'));

    const [ingredient] = await sql`select xmin::text as xmin from ingredients where id = ${id}`;
    const [added] = await sql`
      select xmin::text as xmin from ingredient_folk_names
      where ingredient_id = ${id} and name = 'Fixture Herb'`;
    const [removed] = await sql`
      select xmin::text as xmin from ingredient_folk_names
      where ingredient_id = ${id} and name = 'Testwort'`;
    expect(added.xmin).toBe(ingredient.xmin);
    expect(removed.xmin).toBe(ingredient.xmin);
  });

  it('does not add the old name twice when a folk name already matches it, in any case', async () => {
    const id = await local({
      name: 'Fixture Herb',
      canonicalName: 'Fixtura testalis',
      folkNames: ['Testwort', 'FIXTURE HERB'],
    });

    await promoteFolkName(asUser(A), WORKSPACE_W_ID, id, await folkIdOf(id, 'Testwort'));

    expect(await liveNames(id)).toEqual(['FIXTURE HERB']);
  });

  it('swaps a folk name that differs from the display name only by case', async () => {
    const id = await local({
      name: 'Fixture Herb',
      canonicalName: 'Fixtura testalis',
      folkNames: ['FIXTURE HERB'],
    });

    await promoteFolkName(asUser(A), WORKSPACE_W_ID, id, await folkIdOf(id, 'FIXTURE HERB'));

    expect((await rowOf(id)).name).toBe('FIXTURE HERB');
    expect(await liveNames(id)).toEqual(['Fixture Herb']);
  });

  it('keeps the identity key of a row that declares a formal name', async () => {
    const id = await local({
      name: 'Fixture Herb',
      canonicalName: 'Fixtura testalis',
      folkNames: ['Testwort'],
    });
    const before = (await rowOf(id)).identity_key;

    await promoteFolkName(asUser(A), WORKSPACE_W_ID, id, await folkIdOf(id, 'Testwort'));

    expect((await rowOf(id)).identity_key).toBe(before);
    expect((await rowOf(id)).slug).toBe(ingredientSlug('Testwort', 'Fixtura testalis'));
  });

  it('moves the identity key of a row with no formal name', async () => {
    const id = await local({ name: 'Fixture Herb', folkNames: ['Testwort'] });

    await promoteFolkName(asUser(A), WORKSPACE_W_ID, id, await folkIdOf(id, 'Testwort'));

    expect((await rowOf(id)).identity_key).toBe('testwort');
  });

  it('refuses, at the name, when the new name is another entry’s identity', async () => {
    await local({ name: 'Testwort' });
    const id = await local({ name: 'Fixture Herb', folkNames: ['testwort'] });

    const refusal = promoteFolkName(asUser(A), WORKSPACE_W_ID, id, await folkIdOf(id, 'testwort'));

    await expect(refusal).rejects.toBeInstanceOf(ValidationError);
    await expect(refusal).rejects.toMatchObject({ issues: [{ path: ['name'] }] });
    expect((await rowOf(id)).name).toBe('Fixture Herb');
    expect(await liveNames(id)).toEqual(['testwort']);
  });

  it('retires the old slug of a compendium entry, whose address moves with its name', async () => {
    const id = await compendium({
      name: 'Fixture Herb',
      canonicalName: 'Fixtura testalis',
      folkNames: ['Testwort'],
    });
    const old = (await rowOf(id)).slug as string;

    await promoteFolkName(asUser(E), null, id, await folkIdOf(id, 'Testwort'));

    const retired =
      await sql`select slug from retired_ingredient_slugs where ingredient_id = ${id}`;
    expect(retired.map((r) => r.slug)).toEqual([old]);
    expect((await rowOf(id)).name).toBe('Testwort');
  });
});

describe('promoteFolkName — who may', () => {
  const setup = async () => {
    const id = await local({
      name: 'Fixture Herb',
      canonicalName: 'Fixtura testalis',
      folkNames: ['Testwort'],
    });
    return { id, folkNameId: await folkIdOf(id, 'Testwort') };
  };

  // The member stands for the owner too: both hold the one write permission
  // (tests/modules/coven/services/access-control.test.ts).
  it('lets a member promote on a coven’s ingredient', async () => {
    const { id, folkNameId } = await setup();

    await promoteFolkName(asUser(B), WORKSPACE_W_ID, id, folkNameId);

    expect((await rowOf(id)).name).toBe('Testwort');
  });

  it('refuses a viewer, who could read the ingredient, and writes nothing', async () => {
    const { id, folkNameId } = await setup();

    await expect(promoteFolkName(asUser(C), WORKSPACE_W_ID, id, folkNameId)).rejects.toBeInstanceOf(
      Forbidden,
    );

    expect((await rowOf(id)).name).toBe('Fixture Herb');
  });

  it('refuses a member of another coven', async () => {
    const { id, folkNameId } = await setup();

    await expect(promoteFolkName(asUser(D), WORKSPACE_W_ID, id, folkNameId)).rejects.toBeInstanceOf(
      Forbidden,
    );
  });

  it('refuses a site admin on a coven’s ingredient', async () => {
    const { id, folkNameId } = await setup();

    await expect(promoteFolkName(asUser(E), WORKSPACE_W_ID, id, folkNameId)).rejects.toBeInstanceOf(
      Forbidden,
    );
  });

  it('does not find a coven’s ingredient by id through another coven the caller belongs to', async () => {
    const { id, folkNameId } = await setup();

    // D owns a seat in X; the id belongs to W.
    await expect(promoteFolkName(asUser(D), WORKSPACE_X_ID, id, folkNameId)).rejects.toBeInstanceOf(
      NotFound,
    );
    expect((await rowOf(id)).name).toBe('Fixture Herb');
  });

  it('lets a site admin promote on a compendium entry', async () => {
    const id = await compendium({
      name: 'Fixture Herb',
      canonicalName: 'Fixtura testalis',
      folkNames: ['Testwort'],
    });

    await promoteFolkName(asUser(E), null, id, await folkIdOf(id, 'Testwort'));

    expect((await rowOf(id)).name).toBe('Testwort');
  });

  // The owner stands for every coven role: a compendium entry takes the
  // curator check, which no coven role passes.
  it('refuses a coven owner on a compendium entry', async () => {
    const user = A;
    const id = await compendium({
      name: 'Fixture Herb',
      canonicalName: 'Fixtura testalis',
      folkNames: ['Testwort'],
    });

    await expect(
      promoteFolkName(asUser(user), null, id, await folkIdOf(id, 'Testwort')),
    ).rejects.toBeInstanceOf(Forbidden);

    expect((await rowOf(id)).name).toBe('Fixture Herb');
  });

  it('does not reach a compendium entry through a coven, nor a coven’s through the compendium', async () => {
    const entry = await compendium({
      name: 'Fixture Herb',
      canonicalName: 'Fixtura testalis',
      folkNames: ['Testwort'],
    });
    const { id, folkNameId } = await setup();

    await expect(
      promoteFolkName(asUser(A), WORKSPACE_W_ID, entry, await folkIdOf(entry, 'Testwort')),
    ).rejects.toBeInstanceOf(NotFound);
    await expect(promoteFolkName(asUser(E), null, id, folkNameId)).rejects.toBeInstanceOf(NotFound);
  });
});

describe('promoteFolkName — what it names', () => {
  it('refuses a folk name that belongs to another ingredient', async () => {
    const id = await local({ name: 'Fixture Herb', canonicalName: 'Fixtura testalis' });
    const other = await local({
      name: 'Other Herb',
      canonicalName: 'Fixtura altera',
      folkNames: ['Testwort'],
    });

    await expect(
      promoteFolkName(asUser(A), WORKSPACE_W_ID, id, await folkIdOf(other, 'Testwort')),
    ).rejects.toBeInstanceOf(NotFound);
  });

  it('refuses a folk name already removed, and an id that is not one', async () => {
    const id = await local({
      name: 'Fixture Herb',
      canonicalName: 'Fixtura testalis',
      folkNames: ['Testwort'],
    });
    const folkNameId = await folkIdOf(id, 'Testwort');
    await sql`update ingredient_folk_names set deleted_at = now() where id = ${folkNameId}`;

    await expect(promoteFolkName(asUser(A), WORKSPACE_W_ID, id, folkNameId)).rejects.toBeInstanceOf(
      NotFound,
    );
    await expect(
      promoteFolkName(asUser(A), WORKSPACE_W_ID, id, 'not-an-id'),
    ).rejects.toBeInstanceOf(NotFound);
    await expect(
      promoteFolkName(asUser(A), WORKSPACE_W_ID, 'not-an-id', folkNameId),
    ).rejects.toBeInstanceOf(NotFound);
  });
});

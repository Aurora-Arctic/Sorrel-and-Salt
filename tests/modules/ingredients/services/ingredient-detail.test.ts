import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { Forbidden, NotFound } from '@/lib/errors';
import {
  createCompendiumEntry,
  getIngredient,
  ingredientDetailOf,
  readCompendiumEntry,
  updateCompendiumEntry,
} from '@/modules/ingredients';
import { A, B, D, E, asUser } from '../../../support/as-user';
import { curatedDeityId, curatedFormId } from '../../../support/db/curated-ids';
import { useTestDatabase } from '../../../support/db/database';
import {
  insertDeityLink,
  insertIngredient,
  insertSubstituteLink,
  insertVariant,
} from '../../../support/db/insert-ingredient';
import {
  type IngredientFixture,
  type Overrides,
  makeIngredient,
  makeVariant,
} from '../../../support/fixtures';

// M8.19: the page body's one read, `ingredientDetailOf`, and the public
// route's cached read of an address, `readCompendiumEntry`. The table is
// emptied per test, so every row a result could come from is one this file
// wrote. Setup goes through the raw client; only the rename and the create
// that move an address are the services', since they are what retire one.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

const admin = asUser(E);

/** Seeds a row through the shared inserter, stamped by A. */
const seed = (overrides: Overrides<IngredientFixture> = {}) =>
  insertIngredient(sql, makeIngredient(overrides), A.id);

async function rowOf(id: string) {
  const [row] = await sql`select * from ingredients where id = ${id}`;
  return row;
}

/** The ingredient row as the page reads it, through the public read. */
async function entryOf(id: string) {
  return getIngredient(null, id);
}

/** An admin's write input for an entry holding no form, so no curated pick is needed. */
function input(
  overrides: Overrides<IngredientFixture> = {},
): Parameters<typeof createCompendiumEntry>[1] {
  const { workspaceId: _tier, categories: _categories, ...rest } = makeIngredient(overrides);
  return { ...rest, substitutes: [], deities: [], variants: [] };
}

describe('ingredientDetailOf', () => {
  it('gathers a compendium entry: its lists, and each form with its icon and its own lists', async () => {
    // The linked substitutes: one ingredient whole, one naming a form of another.
    const whole = await seed({ name: 'Testleaf', nomenclature: 'none', variants: [] });
    const withForms = await seed({
      name: 'Testbark',
      nomenclature: 'none',
      variants: [makeVariant({ form: 'Testpowder' })],
    });
    const [{ id: powderId }] = await sql`
      select id from ingredient_variants where ingredient_id = ${withForms}`;

    // Created with the uncurated form first, so the order read is the sort's.
    const id = await seed({
      folkNames: ['Testkin', 'Fixture-root'],
      categories: ['Protection', 'Love'],
      substitutes: ['Typed stand-in'],
      deities: ['Typed deity'],
      variants: [
        makeVariant({ form: 'Testform', categories: ['Warding'], substitutes: ['Form typed'] }),
      ],
    });
    await insertDeityLink(sql, id, await curatedDeityId(sql, 'Thor'), 1, A.id);
    await insertSubstituteLink(sql, id, whole, A.id);
    await insertSubstituteLink(sql, id, withForms, A.id, { substituteVariantId: powderId });
    const herb = await insertVariant(
      sql,
      id,
      makeVariant({
        form: 'Herb',
        formId: await curatedFormId(sql, 'Herb'),
        categories: ['Banishing'],
      }),
      A.id,
    );
    await insertSubstituteLink(sql, id, whole, A.id, { variantId: herb });

    const entry = await entryOf(id);
    const detail = await ingredientDetailOf(null, entry);

    expect(detail.entry).toEqual(entry);
    expect(detail.folkNames.sort()).toEqual(['Fixture-root', 'Testkin']);
    expect(detail.categories.map(({ category, group }) => [category.name, group.name])).toEqual([
      ['Love', 'Love & Connection'],
      ['Protection', 'Protection & Defense'],
    ]);
    for (const { category, group } of detail.categories) expect(group.id).toBe(category.groupId);
    expect(detail.deities).toEqual([
      { name: 'Typed deity', tradition: null },
      { name: 'Thor', tradition: 'Norse' },
    ]);
    expect(detail.substitutes).toEqual([
      {
        name: 'Testbark',
        ingredient: expect.objectContaining({ id: withForms }),
        form: 'Testpowder',
      },
      { name: 'Testleaf', ingredient: expect.objectContaining({ id: whole }), form: null },
      { name: 'Typed stand-in', ingredient: null, form: null },
    ]);
    // The link carries what the page follows it by, and nothing else of the row.
    expect(Object.keys(detail.substitutes[1].ingredient ?? {}).sort()).toEqual([
      'id',
      'slug',
      'workspaceId',
    ]);

    // The forms in the order of their names, not of their creation.
    expect(detail.variants.map(({ variant }) => variant.form)).toEqual(['Herb', 'Testform']);
    const [herbDetail, plainDetail] = detail.variants;
    expect(herbDetail.variant.id).toBe(herb);
    expect(herbDetail.icon).toBe('botanical');
    expect(herbDetail.categories.map(({ category, group }) => [category.name, group.name])).toEqual(
      [['Banishing', 'Protection & Defense']],
    );
    expect(herbDetail.substitutes).toEqual([
      { name: 'Testleaf', ingredient: expect.objectContaining({ id: whole }), form: null },
    ]);
    expect(plainDetail.icon).toBeNull();
    expect(plainDetail.categories.map(({ category }) => category.name)).toEqual(['Warding']);
    expect(plainDetail.substitutes).toEqual([{ name: 'Form typed', ingredient: null, form: null }]);
  });

  it('answers an entry with nothing beneath it as empty lists', async () => {
    const id = await seed({ variants: [] });

    expect(await ingredientDetailOf(null, await entryOf(id))).toEqual({
      entry: expect.objectContaining({ id }),
      folkNames: [],
      categories: [],
      deities: [],
      substitutes: [],
      variants: [],
    });
  });

  it("reads a coven's own entry for a member, and refuses a member of an unrelated coven", async () => {
    const id = await seed({
      workspaceId: WORKSPACE_W_ID,
      folkNames: ['Testkin'],
      variants: [makeVariant({ form: 'Testform', categories: ['Warding'] })],
    });
    const entry = await getIngredient(asUser(A), id, WORKSPACE_W_ID);
    // Why D's read could have gone through: the entry is there, and a coven's.
    expect((await rowOf(id)).workspace_id).toBe(WORKSPACE_W_ID);
    expect(entry.workspaceId).toBe(WORKSPACE_W_ID);

    for (const member of [A, B]) {
      const detail = await ingredientDetailOf(asUser(member), entry);
      expect(detail.folkNames).toEqual(['Testkin']);
      expect(detail.variants[0].categories.map(({ category }) => category.name)).toEqual([
        'Warding',
      ]);
    }
    await expect(ingredientDetailOf(asUser(D), entry)).rejects.toThrow(Forbidden);
    await expect(ingredientDetailOf(null, entry)).rejects.toThrow(Forbidden);
  });
});

describe('readCompendiumEntry', () => {
  it('answers the entry at its slug, with no moved-away entry', async () => {
    const id = await seed();

    await expect(readCompendiumEntry('testwort-fixtura-testalis')).resolves.toEqual({
      kind: 'entry',
      detail: expect.objectContaining({ entry: expect.objectContaining({ id }) }),
      movedAway: null,
    });
  });

  it('answers a retired slug as moved to the new one, which answers the entry', async () => {
    const id = await seed({ variants: [] });
    await updateCompendiumEntry(admin, id, input({ name: 'Testwort, relabelled' }));
    const [{ slug }] = await sql`select slug from ingredients where id = ${id}`;
    // Why the old one could still answer an entry: it was this entry's address.
    expect(slug).not.toBe('testwort-fixtura-testalis');

    await expect(readCompendiumEntry('testwort-fixtura-testalis')).resolves.toEqual({
      kind: 'moved',
      slug,
    });
    await expect(readCompendiumEntry(slug)).resolves.toMatchObject({
      kind: 'entry',
      detail: { entry: { id } },
      movedAway: null,
    });
  });

  it('names the entry that moved off an address another entry has taken, inside its window', async () => {
    const movedId = await seed({ name: 'Testdirt', nomenclature: 'none', variants: [] });
    await updateCompendiumEntry(admin, movedId, input({ name: 'Testsoil', nomenclature: 'none' }));
    const taker = await createCompendiumEntry(admin, {
      ...input({ name: 'Testdirt', nomenclature: 'none' }),
      endRedirect: true,
    });

    await expect(readCompendiumEntry('testdirt')).resolves.toEqual({
      kind: 'entry',
      detail: expect.objectContaining({ entry: expect.objectContaining({ id: taker.id }) }),
      movedAway: { name: 'Testsoil', slug: 'testsoil' },
    });
  });

  it('answers NotFound for an address that names nothing', async () => {
    await expect(readCompendiumEntry('nothing-here')).rejects.toThrow(NotFound);
  });

  // MB.85 cites this test for "a coven's entry is a 404 at the public address"
  // rather than repeating it.
  it("a workspace entry's slug at the public read is NotFound", async () => {
    const id = await seed({ workspaceId: WORKSPACE_W_ID });
    const [{ slug }] = await sql`select slug from ingredients where id = ${id}`;
    // Why it could have answered: the row is there, at that slug, and a coven's.
    expect((await rowOf(id)).workspace_id).toBe(WORKSPACE_W_ID);
    expect(slug).toBe('testwort-fixtura-testalis');

    await expect(readCompendiumEntry(slug)).rejects.toThrow(NotFound);
  });
});

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
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
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import {
  insertDeityLink,
  insertIngredient,
  insertSubstituteLink,
  insertVariant,
} from '../../../support/db/insert-ingredient';
import {
  insertReference,
  insertReferenceLink,
  insertVariantReferenceLink,
} from '../../../support/db/insert-reference';
import {
  type IngredientFixture,
  type Overrides,
  makeIngredient,
  makeVariant,
} from '../../../support/fixtures';

// The page body's one read, `ingredientDetailOf`, and the public route's cached read of an address, `readCompendiumEntry`.
// The table is emptied per test, so every row a result could come from is one this file wrote. Setup goes through the raw client; only the rename and create that move an address are the services', since they retire one.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

// The curated rows the page reads through, all invented: `truncate ingredients`
// leaves the vocabulary tables alone, so they are written once for the file.
let deityId: string;
let formId: string;
beforeAll(async () => {
  const stamps = { created_by: A.id, updated_by: A.id };
  const colours = { color_dark: '#8b5cf6', color_light: '#5b21b6' };
  const [wards, bonds] = await sql`
    insert into category_groups ${sql([
      {
        name: 'Fixture Wards',
        slug: 'fixture-wards',
        description: 'Invented',
        ...colours,
        ...stamps,
      },
      {
        name: 'Fixture Bonds',
        slug: 'fixture-bonds',
        description: 'Invented',
        ...colours,
        ...stamps,
      },
    ])} returning id`;
  await sql`
    insert into categories ${sql([
      {
        name: 'Fixture Alpha',
        slug: 'fixture-alpha',
        description: 'Invented',
        group_id: bonds.id,
        ...stamps,
      },
      {
        name: 'Fixture Beta',
        slug: 'fixture-beta',
        description: 'Invented',
        group_id: wards.id,
        ...stamps,
      },
      {
        name: 'Fixture Gamma',
        slug: 'fixture-gamma',
        description: 'Invented',
        group_id: wards.id,
        ...stamps,
      },
      {
        name: 'Fixture Delta',
        slug: 'fixture-delta',
        description: 'Invented',
        group_id: wards.id,
        ...stamps,
      },
    ])}`;
  const [tradition] = await sql`
    insert into deity_traditions ${sql({ name: 'Fixturan', slug: 'fixturan', description: 'Invented', ...stamps })}
    returning id`;
  [{ id: deityId }] = await sql`
    insert into deities ${sql({
      name: 'Fixturus',
      slug: 'fixturus',
      description: 'Invented',
      tradition_id: tradition.id,
      ...stamps,
    })} returning id`;
  // Its other names: two live, read alphabetically, and one dropped.
  await sql`
    insert into deity_other_names ${sql([
      { deity_id: deityId, name: 'Fixturion', deleted_at: null, deleted_by: null, ...stamps },
      { deity_id: deityId, name: 'Fixtor', deleted_at: null, deleted_by: null, ...stamps },
      { deity_id: deityId, name: 'Fixtorius', deleted_at: new Date(), deleted_by: A.id, ...stamps },
    ])}`;
  const [group] = await sql`
    insert into ingredient_form_groups ${sql({
      name: 'Fixture Forms',
      slug: 'fixture-forms',
      description: 'Invented',
      icon: 'botanical',
      ...stamps,
    })} returning id`;
  [{ id: formId }] = await sql`
    insert into ingredient_forms ${sql({
      name: 'Fixtureform',
      slug: 'fixtureform',
      description: 'Invented',
      group_id: group.id,
      ...stamps,
    })} returning id`;
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
      categories: ['Fixture Beta', 'Fixture Alpha'],
      substitutes: ['Typed stand-in'],
      deities: ['Typed deity'],
      variants: [
        makeVariant({
          form: 'Testform',
          categories: ['Fixture Gamma'],
          substitutes: ['Form typed'],
        }),
      ],
    });
    await insertDeityLink(sql, id, deityId, 1, A.id);
    await insertSubstituteLink(sql, id, whole, A.id);
    await insertSubstituteLink(sql, id, withForms, A.id, { substituteVariantId: powderId });
    const herb = await insertVariant(
      sql,
      id,
      makeVariant({
        form: 'Fixtureform',
        formId,
        categories: ['Fixture Delta'],
      }),
      A.id,
    );
    await insertSubstituteLink(sql, id, whole, A.id, { variantId: herb });

    const entry = await entryOf(id);
    const detail = await ingredientDetailOf(null, entry);

    expect(detail.entry).toEqual(entry);
    expect(detail.folkNames.sort()).toEqual(['Fixture-root', 'Testkin']);
    expect(detail.categories.map(({ category, group }) => [category.name, group.name])).toEqual([
      ['Fixture Alpha', 'Fixture Bonds'],
      ['Fixture Beta', 'Fixture Wards'],
    ]);
    for (const { category, group } of detail.categories) expect(group.id).toBe(category.groupId);
    expect(detail.deities).toEqual([
      { name: 'Typed deity', tradition: null, otherNames: [] },
      { name: 'Fixturus', tradition: 'Fixturan', otherNames: ['Fixtor', 'Fixturion'] },
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
    expect(detail.variants.map(({ variant }) => variant.form)).toEqual(['Fixtureform', 'Testform']);
    const [herbDetail, plainDetail] = detail.variants;
    expect(herbDetail.variant.id).toBe(herb);
    expect(herbDetail.icon).toBe('botanical');
    expect(herbDetail.categories.map(({ category, group }) => [category.name, group.name])).toEqual(
      [['Fixture Delta', 'Fixture Wards']],
    );
    expect(herbDetail.substitutes).toEqual([
      { name: 'Testleaf', ingredient: expect.objectContaining({ id: whole }), form: null },
    ]);
    expect(plainDetail.icon).toBeNull();
    expect(plainDetail.categories.map(({ category }) => category.name)).toEqual(['Fixture Gamma']);
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
      references: [],
      variants: [],
      cupboardEntry: null,
      retired: false,
    });
  });

  it('reads the references the entry and each form cite, alphabetical by citation, with their locators', async () => {
    const id = await seed({ variants: [] });
    const herb = await insertVariant(sql, id, makeVariant({ form: 'Fixtureform' }), A.id);
    const zeta = await insertReference(sql, { title: 'Zeta Fixtures' }, A.id);
    const alpha = await insertReference(sql, { title: 'Alpha Fixtures' }, A.id);
    const formOnly = await insertReference(sql, { title: 'Form Fixtures' }, A.id);
    await insertReferenceLink(sql, id, zeta, A.id);
    await insertReferenceLink(sql, id, alpha, A.id, 'p. 7');
    await insertVariantReferenceLink(sql, herb, formOnly, A.id, 'ch. 2');

    const detail = await ingredientDetailOf(null, await entryOf(id));

    expect(detail.references.map(({ reference, locator }) => [reference.title, locator])).toEqual([
      ['Alpha Fixtures', 'p. 7'],
      ['Zeta Fixtures', null],
    ]);
    expect(
      detail.variants[0]!.references.map(({ reference, locator }) => [reference.title, locator]),
    ).toEqual([['Form Fixtures', 'ch. 2']]);
  });

  it("reads a coven's own entry for a member, and refuses a member of an unrelated coven", async () => {
    const id = await seed({
      workspaceId: WORKSPACE_W_ID,
      folkNames: ['Testkin'],
      variants: [makeVariant({ form: 'Testform', categories: ['Fixture Gamma'] })],
    });
    const entry = await getIngredient(asUser(A), id, WORKSPACE_W_ID);
    // Why D's read could have gone through: the entry is there, and a coven's.
    expect((await rowOf(id)).workspace_id).toBe(WORKSPACE_W_ID);
    expect(entry.workspaceId).toBe(WORKSPACE_W_ID);

    for (const member of [A, B]) {
      const detail = await ingredientDetailOf(asUser(member), entry);
      expect(detail.folkNames).toEqual(['Testkin']);
      expect(detail.variants[0].categories.map(({ category }) => category.name)).toEqual([
        'Fixture Gamma',
      ]);
    }
    await expect(ingredientDetailOf(asUser(D), entry)).rejects.toThrow(Forbidden);
    await expect(ingredientDetailOf(null, entry)).rejects.toThrow(Forbidden);
  });

  it("carries the coven's cupboard entry for a compendium entry read in that coven, and refuses an outsider", async () => {
    const id = await seed({ variants: [] });
    const row = await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: id, label: 'Hedgewort' },
      A.id,
    );
    const entry = await entryOf(id);

    expect((await ingredientDetailOf(asUser(B), entry, WORKSPACE_W_ID)).cupboardEntry?.id).toBe(
      row,
    );
    // Read outside a coven, as the public route reads it, there is none.
    expect((await ingredientDetailOf(null, entry)).cupboardEntry).toBeNull();
    await expect(ingredientDetailOf(asUser(D), entry, WORKSPACE_W_ID)).rejects.toThrow(Forbidden);
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

  // This test stands for "a coven's entry is a 404 at the public address"
  // wherever that is cited, rather than repeating it.
  it("a workspace entry's slug at the public read is NotFound", async () => {
    const id = await seed({ workspaceId: WORKSPACE_W_ID });
    const [{ slug }] = await sql`select slug from ingredients where id = ${id}`;
    // Why it could have answered: the row is there, at that slug, and a coven's.
    expect((await rowOf(id)).workspace_id).toBe(WORKSPACE_W_ID);
    expect(slug).toBe('testwort-fixtura-testalis');

    await expect(readCompendiumEntry(slug)).rejects.toThrow(NotFound);
  });
});

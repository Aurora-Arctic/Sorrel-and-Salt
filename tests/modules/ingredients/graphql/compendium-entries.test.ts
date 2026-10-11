import { GraphQLInputObjectType, isNonNullType } from 'graphql';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { schema } from '@/graphql/schema';
import type { Session } from '@/lib/session';
import { A, B, E, asUser } from '../../../support/as-user';
import { curatedFormId } from '../../../support/db/curated-ids';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';
import type { WorkspaceIngredientNode } from './types';

// Story 18 over the wire (M5.5): the site admin's three compendium writes.
// This file holds the transport's half (claude-docs/testing/layer-ownership.md):
// the SDL's own refusals, the loaders cleared between two writes in one
// request, `endRedirect` reaching the service, and one refusal per error code
// per mutation, read as the browser reads it. Who is refused, and every
// collision, are services/compendium-entries.test.ts's; a signed-out caller
// and a non-admin at the `admin` scope are tests/db/graphql-query-scopes.test.ts's.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

// The curated forms an entry here picks, as the admin's autofill would.
let herb: string;
let earth: string;
beforeAll(async () => {
  herb = await curatedFormId(sql, 'Herb');
  earth = await curatedFormId(sql, 'Earth');
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

const FIELDS = `
  id name slug canonicalName nomenclature form isGlobal folkNames
  substitutes { name } deities { name } categories { name }
  audit { createdBy updatedBy }
`;

const CREATE = `mutation ($input: CompendiumIngredientInput!, $endRedirect: Boolean) {
  createCompendiumIngredient(input: $input, endRedirect: $endRedirect) { ${FIELDS} }
}`;

const UPDATE = `mutation ($id: ID!, $input: CompendiumIngredientUpdateInput!, $endRedirect: Boolean) {
  updateCompendiumIngredient(id: $id, input: $input, endRedirect: $endRedirect) { ${FIELDS} }
}`;

const DELETE = 'mutation ($id: ID!) { deleteCompendiumIngredient(id: $id) }';

const READ = 'query ($id: ID!) { ingredient(id: $id) { id name } }';

const create = (session: Session | null, input: Record<string, unknown>, endRedirect?: boolean) =>
  run<{ createCompendiumIngredient: WorkspaceIngredientNode }>(session, CREATE, {
    input,
    endRedirect,
  });

const update = (
  session: Session | null,
  id: string,
  input: Record<string, unknown>,
  endRedirect?: boolean,
) =>
  run<{ updateCompendiumIngredient: WorkspaceIngredientNode }>(session, UPDATE, {
    id,
    input: whole(input),
    endRedirect,
  });

const remove = (session: Session | null, id: string) =>
  run<{ deleteCompendiumIngredient: string }>(session, DELETE, { id });

const read = (session: Session | null, id: string) =>
  run<{ ingredient: { id: string; name: string } | null }>(session, READ, { id });

/** Testwort as the admin's form sends it, its form picked from the curated list. */
const testwort = (overrides: Record<string, unknown> = {}) => ({
  name: 'Testwort',
  canonicalName: 'Fixtura testalis',
  nomenclature: 'botanical',
  form: 'Herb',
  formId: herb,
  ...overrides,
});

/** A nameless entry of earth, graveyard-dirt shaped, under `name`. */
const earthy = (name: string) => ({
  name,
  canonicalName: null,
  nomenclature: 'none',
  form: 'Earth',
  formId: earth,
});

/**
 * The whole entry as the update input takes it: every field sent, and an
 * empty value where `input` has none.
 */
function whole(input: Record<string, unknown>): Record<string, unknown> {
  const empty: Record<string, unknown> = {
    canonicalName: '',
    form: '',
    formId: '',
    description: '',
    elements: [],
    planets: [],
    zodiacSigns: [],
    deities: [],
    colors: [],
    safetyNotes: '',
    substitutes: [],
    references: [],
    folkNames: [],
    categoryIds: [],
  };
  const sent = Object.entries(input).filter(([, value]) => value != null);
  return { ...empty, ...Object.fromEntries(sent) };
}

/** The live category names an entry is filed under, alphabetically. */
const categoriesOf = async (id: string) =>
  (
    await sql`
      select categories.name from ingredient_categories
      join categories on categories.id = ingredient_categories.category_id
      where ingredient_categories.ingredient_id = ${id} order by categories.name`
  ).map((row) => row.name as string);

/** Seeds a compendium entry through the shared inserter, stamped by A — not through the code under test. */
const seed = (overrides: Overrides<IngredientFixture> = {}) =>
  insertIngredient(sql, makeIngredient(overrides), A.id);

async function rowOf(id: string) {
  const [row] = await sql`select * from ingredients where id = ${id}`;
  return row;
}

const countIngredients = async () => {
  const [row] = await sql`select count(*)::int as n from ingredients`;
  return row.n as number;
};

describe('createCompendiumIngredient', () => {
  it('writes an entry for a site admin, in the compendium and stamped by them', async () => {
    const result = await create(asUser(E), testwort({ folkNames: ['Fixture Root'] }));

    expect(result.errors).toBeUndefined();
    const created = result.data?.createCompendiumIngredient as WorkspaceIngredientNode;
    expect(created).toMatchObject({
      name: 'Testwort',
      slug: 'testwort-herb-fixtura-testalis',
      nomenclature: 'botanical',
      isGlobal: true,
      folkNames: ['Fixture Root'],
      audit: { createdBy: E.id, updatedBy: E.id },
    });
    expect(await rowOf(created.id)).toMatchObject({
      workspace_id: null,
      created_by: E.id,
      updated_by: E.id,
    });
  });

  it('refuses an input without a nomenclature before any resolver runs, writing nothing', async () => {
    const { nomenclature: _nomenclature, ...withoutKind } = testwort();

    const result = await create(asUser(E), withoutKind);

    expect(result.data ?? null).toBeNull();
    expect(result.errors?.[0]?.message).toMatch(
      /Field "nomenclature" of required type "Nomenclature!" was not provided/,
    );
    expect(await countIngredients()).toBe(0);
  });

  it('answers a formal name and form already in the compendium as VALIDATION on `canonicalName`', async () => {
    await seed();

    const result = await create(asUser(E), testwort({ name: 'Fixture Leaf' }));

    expect(result.data ?? null).toBeNull();
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['canonicalName'] }],
    });
    expect(await countIngredients()).toBe(1);
  });
});

describe('updateCompendiumIngredient', () => {
  // An update replaces the entry, so a field the input left out would be
  // cleared: the categories above all, which no form field may show (MB.159).
  it('refuses an input that leaves a field out, changing nothing', async () => {
    const id = await seed({ categories: ['Protection'] });
    // Why it could have cleared something: the entry is filed under a category.
    expect(await categoriesOf(id)).toEqual(['Protection']);
    const { categoryIds: _categoryIds, ...withoutCategories } = whole(testwort());

    const result = await run(asUser(E), UPDATE, { id, input: withoutCategories });

    expect(result.data ?? null).toBeNull();
    expect(result.errors?.[0]?.message).toMatch(
      /Field "categoryIds" of required type "\[ID!\]!" was not provided/,
    );
    expect(await categoriesOf(id)).toEqual(['Protection']);
  });

  it('declares every field of its input required', () => {
    const input = schema.getType('CompendiumIngredientUpdateInput');
    expect(input).toBeInstanceOf(GraphQLInputObjectType);
    const fields = Object.values((input as GraphQLInputObjectType).getFields());
    // Precondition: the input is the whole entry, not a stub.
    expect(fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(['name', 'nomenclature', 'formId', 'folkNames', 'categoryIds']),
    );

    expect(fields.filter((field) => !isNonNullType(field.type)).map((field) => field.name)).toEqual(
      [],
    );
  });

  it('replaces the entry for a site admin, stamping updated_by and keeping created_by', async () => {
    const id = await seed();

    const result = await update(asUser(E), id, testwort({ description: 'Redescribed' }));

    expect(result.errors).toBeUndefined();
    expect(result.data?.updateCompendiumIngredient).toMatchObject({
      id,
      audit: { createdBy: A.id, updatedBy: E.id },
    });
    expect(await rowOf(id)).toMatchObject({
      description: 'Redescribed',
      created_by: A.id,
      updated_by: E.id,
    });
  });

  // Root mutation fields run one after another in one request, so the second
  // must not answer the children the first one read.
  it('answers its own folk names and substitutes when one request updates the entry twice', async () => {
    const id = await seed();
    const twice = `mutation ($id: ID!, $first: CompendiumIngredientUpdateInput!, $second: CompendiumIngredientUpdateInput!) {
      first: updateCompendiumIngredient(id: $id, input: $first) { folkNames substitutes { name } }
      second: updateCompendiumIngredient(id: $id, input: $second) { folkNames substitutes { name } }
    }`;

    const result = await run<{ first: WorkspaceIngredientNode; second: WorkspaceIngredientNode }>(
      asUser(E),
      twice,
      {
        id,
        first: whole(
          testwort({ folkNames: ['First Root'], substitutes: [{ name: 'First Zest' }] }),
        ),
        second: whole(
          testwort({ folkNames: ['Second Root'], substitutes: [{ name: 'Second Zest' }] }),
        ),
      },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.first.folkNames).toEqual(['First Root']);
    expect(result.data?.second.folkNames).toEqual(['Second Root']);
    expect(result.data?.first.substitutes).toEqual([{ name: 'First Zest' }]);
    expect(result.data?.second.substitutes).toEqual([{ name: 'Second Zest' }]);
  });

  it("is NOT_FOUND for a coven's ingredient, the admin's own call included", async () => {
    const id = await seed({ workspaceId: WORKSPACE_W_ID, nomenclature: 'none' });
    const before = await rowOf(id);

    const result = await update(asUser(E), id, testwort());

    expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    expect(await rowOf(id)).toEqual(before);
  });

  // MB.82: an address another entry moved off redirects to it for a window,
  // and taking it is the admin's to confirm.
  describe('onto an address another entry moved off, inside its window', () => {
    let movedId: string;

    beforeEach(async () => {
      movedId = await seed({ name: 'Testsoil', nomenclature: 'none', form: 'earth' });
      await sql`
        insert into retired_ingredient_slugs ${sql({
          ingredient_id: movedId,
          slug: 'testdirt-earth',
          created_by: E.id,
          updated_by: E.id,
        })}`;
    });

    it('refuses a rename into it as VALIDATION on `endRedirect`, then takes it when resent confirmed', async () => {
      const id = await seed({ name: 'Testclay', nomenclature: 'none', form: 'earth' });
      const before = await rowOf(id);

      const refused = await update(asUser(E), id, earthy('Testdirt'));

      expect(refused.data ?? null).toBeNull();
      const [issue] = refused.errors?.[0]?.extensions?.fieldErrors ?? [];
      expect(refused.errors?.[0]?.extensions?.code).toBe('VALIDATION');
      expect(issue.path).toEqual(['endRedirect']);
      expect(await rowOf(id)).toEqual(before);

      const confirmed = await update(asUser(E), id, earthy('Testdirt'), true);

      expect(confirmed.errors).toBeUndefined();
      expect(confirmed.data?.updateCompendiumIngredient).toMatchObject({
        id,
        slug: 'testdirt-earth',
      });
    });
  });
});

describe('deleteCompendiumIngredient', () => {
  /** The ids of the whole compendium as the public list answers them. */
  async function listedIds(): Promise<string[]> {
    const result = await run<{ compendium: { edges: { node: { id: string } }[] } }>(
      asUser(B),
      'query { compendium(first: 100) { edges { node { id } } } }',
      {},
    );
    expect(result.errors).toBeUndefined();
    return result.data?.compendium.edges.map((edge) => edge.node.id) ?? [];
  }

  it('soft-deletes an entry for a site admin, answering its id and stamping who deleted it', async () => {
    const id = await seed();
    // Why its absence below is the delete's: the entry lists before it.
    expect(await listedIds()).toContain(id);

    expect(await remove(asUser(E), id)).toEqual({ data: { deleteCompendiumIngredient: id } });

    expect(await rowOf(id)).toMatchObject({ deleted_by: E.id, created_by: A.id });
    expect((await rowOf(id)).deleted_at).not.toBeNull();
    expect(await listedIds()).not.toContain(id);
    expect((await read(asUser(B), id)).errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });

  it("is NOT_FOUND for a coven's ingredient, which stays live, and for an id that is not an id", async () => {
    const id = await seed({ workspaceId: WORKSPACE_W_ID, nomenclature: 'none' });

    expect((await remove(asUser(E), id)).errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    expect((await rowOf(id)).deleted_at).toBeNull();
    expect((await remove(asUser(E), 'not-an-ingredient')).errors?.[0]?.extensions?.code).toBe(
      'NOT_FOUND',
    );
  });
});

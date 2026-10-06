import { graphql, type ExecutionResult } from 'graphql';
import { describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import { Forbidden, NotFound } from '@/lib/errors';
import type { Session } from '@/lib/session';
import { createWorkspaceIngredient, getWorkspaceIngredient } from '@/modules/ingredients';
import type { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';
import { A, B, C, D, asUser } from '../support/as-user';
import { useTestDatabase } from '../support/db/database';
import { insertIngredient } from '../support/db/insert-ingredient';
import { noSender } from '../support/email-verification';
import { makeIngredient } from '../support/fixtures';
import type { Duplicate, Entry } from './types';

// Stories 15, 14 and 16 against the services and queries that answer them,
// each written with its task (M8.2, M8.5, M5.10): story 16 is the query the
// name field's warning sends, and a create the warning does not stop.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/** Live rows by this label in either tier, case-folded as the label index compares. */
async function tiersHolding(name: string): Promise<(string | null)[]> {
  const rows = await sql<{ workspace_id: string | null }[]>`
    select workspace_id from ingredients
    where lower(name) = lower(${name}) and deleted_at is null
  `;
  return rows.map((row) => row.workspace_id);
}

describe('Story 15: Create an ingredient local to my workspace when the compendium lacks it.', () => {
  it('lets a member create one that the coven reads, the compendium never gains, and no other coven sees', async () => {
    const {
      workspaceId: _tier,
      categories: _categories,
      substitutes: _substitutes,
      ...fixture
    } = makeIngredient({
      workspaceId: WORKSPACE_W_ID,
      form: 'root',
      folkNames: ['Fixture Root'],
    });
    const input: LocalIngredientInput = fixture;

    // Why this is story 15's case: nothing by this name exists in any tier.
    expect(await tiersHolding(input.name)).toEqual([]);

    const created = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, input);

    for (const user of [A, B, C]) {
      await expect(
        getWorkspaceIngredient(asUser(user), WORKSPACE_W_ID, created.id),
      ).resolves.toMatchObject({ name: input.name, canonicalName: input.canonicalName });
    }
    const [folkName] = await sql`
      select name from ingredient_folk_names where ingredient_id = ${created.id}`;
    expect(folkName.name).toBe('Fixture Root');

    // Local, and only local: the compendium still lacks it.
    expect(await tiersHolding(input.name)).toEqual([WORKSPACE_W_ID]);

    // Another coven's member, by direct id, under either coven's name.
    await expect(getWorkspaceIngredient(asUser(D), WORKSPACE_W_ID, created.id)).rejects.toThrow(
      Forbidden,
    );
    await expect(getWorkspaceIngredient(asUser(D), WORKSPACE_X_ID, created.id)).rejects.toThrow(
      NotFound,
    );
  });

  it('refuses a viewer, who reads the coven but writes nothing', async () => {
    const {
      workspaceId: _tier,
      categories: _categories,
      substitutes: _substitutes,
      ...input
    } = makeIngredient({
      name: 'Fixture Viewerwort',
      nomenclature: 'none',
    });

    await expect(createWorkspaceIngredient(asUser(C), WORKSPACE_W_ID, input)).rejects.toThrow(
      Forbidden,
    );
    expect(await tiersHolding(input.name)).toEqual([]);
  });
});

/** The browser's path: the query as the compendium page's search sends it. */
function query<T>(
  session: Session | null,
  source: string,
  variables: Record<string, unknown> = {},
): Promise<ExecutionResult<T>> {
  return graphql({
    schema,
    source,
    variableValues: variables,
    contextValue: { session, loaders: createLoaders(session), emailVerification: noSender },
  }) as Promise<ExecutionResult<T>>;
}

const LIST = `query ($query: String, $categoryIds: [ID!], $form: String) {
  compendium(query: $query, categoryIds: $categoryIds, form: $form, first: 50) {
    edges { node { id name canonicalName nomenclature folkNames categories { name group { name } } } }
  }
}`;

const ENTRY = `query ($id: ID!, $workspaceId: ID) {
  ingredient(id: $id, workspaceId: $workspaceId) {
    id name canonicalName nomenclature folkNames categories { name group { name } }
  }
}`;

async function browse(
  session: Session | null,
  variables: Record<string, unknown> = {},
): Promise<Entry[]> {
  const result = await query<{ compendium: { edges: { node: Entry }[] } }>(
    session,
    LIST,
    variables,
  );
  expect(result.errors).toBeUndefined();
  return (result.data?.compendium.edges ?? []).map((edge) => edge.node);
}

describe("Story 14: Browse the compendium and add an entry to my workspace's ingredients.", () => {
  it('lets anyone browse the compendium, narrow it and open an entry — signed out included', async () => {
    // What there is to browse: the seed's compendium, in the database's own order.
    const rows = await sql<{ id: string }[]>`
      select id from ingredients where workspace_id is null and deleted_at is null
      order by name, id`;
    expect(rows.length).toBeGreaterThan(0);

    const everything = await browse(null);
    expect(everything.map((entry) => entry.id)).toEqual(rows.map((row) => row.id));

    // Narrowed by a folk name, with the accent left off.
    const byFolkName = await browse(null, { query: 'una de gato' });
    expect(byFolkName.map((entry) => entry.canonicalName).sort()).toEqual([
      'Uncaria guianensis',
      'Uncaria tomentosa',
    ]);

    // Narrowed by a category and by a form.
    const healing = everything
      .flatMap((entry) => entry.categories)
      .find((category) => category.name === 'Healing');
    expect(healing).toBeDefined();
    const [{ id: healingId }] = await sql`select id from categories where name = 'Healing'`;
    const byCategory = await browse(null, { categoryIds: [healingId] });
    expect(byCategory.length).toBeGreaterThan(0);
    expect(byCategory.every((e) => e.categories.some((c) => c.name === 'Healing'))).toBe(true);
    const byForm = await browse(null, { form: 'bark' });
    expect(byForm.map((entry) => entry.canonicalName).sort()).toEqual([
      'Uncaria guianensis',
      'Uncaria tomentosa',
    ]);

    // One entry opened, with everything a page shows.
    const shoestring = everything.find((entry) => entry.name === "Devil's Shoestring") as Entry;
    const opened = await query<{ ingredient: Entry }>(null, ENTRY, { id: shoestring.id });
    expect(opened.errors).toBeUndefined();
    expect(opened.data?.ingredient).toMatchObject({
      name: "Devil's Shoestring",
      canonicalName: null,
      nomenclature: 'unknown',
      folkNames: ['Devil Shoestrings'],
    });
    expect(opened.data?.ingredient.categories.map((category) => category.name)).toEqual([
      'Gambling',
      'Protection',
    ]);
  });

  it("keeps a coven's own ingredient out of the compendium and off the public entry", async () => {
    const localId = await insertIngredient(
      sql,
      makeIngredient({ name: 'Fixture Wroot', nomenclature: 'none', workspaceId: WORKSPACE_W_ID }),
      A.id,
    );
    // Why the two refusals below could have passed wrongly: the row is there,
    // and its coven's member opens it by this id under the coven's name.
    const own = await query<{ ingredient: Entry }>(asUser(B), ENTRY, {
      id: localId,
      workspaceId: WORKSPACE_W_ID,
    });
    expect(own.data?.ingredient).toMatchObject({ name: 'Fixture Wroot' });

    for (const session of [null, asUser(B)]) {
      expect((await browse(session)).map((entry) => entry.name)).not.toContain('Fixture Wroot');
    }
    const publicEntry = await query<{ ingredient: Entry }>(null, ENTRY, { id: localId });
    expect(publicEntry.data).toBeNull();
    expect(publicEntry.errors?.[0]?.originalError).toBeInstanceOf(NotFound);
  });

  it.todo("adds a compendium entry to my workspace's ingredients — M9.4's mutation");
});

const DUPLICATES = `query ($workspaceId: ID!, $name: String!) {
  possibleDuplicates(workspaceId: $workspaceId, name: $name, first: 10) {
    edges { node { id name canonicalName } }
  }
}`;

async function duplicatesOf(session: Session, name: string): Promise<Duplicate[]> {
  const result = await query<{ possibleDuplicates: { edges: { node: Duplicate }[] } }>(
    session,
    DUPLICATES,
    { workspaceId: WORKSPACE_W_ID, name },
  );
  expect(result.errors).toBeUndefined();
  return (result.data?.possibleDuplicates.edges ?? []).map((edge) => edge.node);
}

describe("Story 16: See a warning when the name I'm entering resembles something existing.", () => {
  it('names each near match by its formal name, and opens the one it links to', async () => {
    const matches = await duplicatesOf(asUser(B), 'Cats Claw');

    // Five plants and a cat under one label: only the formal name tells them apart.
    expect(
      matches
        .filter((match) => match.name === "Cat's Claw")
        .map((m) => m.canonicalName)
        .sort(),
    ).toEqual([
      'Dolichandra unguis-cati',
      'Felis catus',
      'Senegalia greggii',
      'Uncaria guianensis',
      'Uncaria tomentosa',
    ]);
    const [first] = matches;
    const opened = await query<{ ingredient: Entry }>(asUser(B), ENTRY, {
      id: first.id,
      workspaceId: WORKSPACE_W_ID,
    });
    expect(opened.data?.ingredient).toMatchObject({
      name: first.name,
      canonicalName: first.canonicalName,
    });
  });

  it('warns of nothing below the threshold', async () => {
    expect(await duplicatesOf(asUser(B), 'Fixture Nothingalike')).toEqual([]);
  });

  it('blocks nothing: a near match is created anyway, and warns the next time', async () => {
    const {
      workspaceId: _tier,
      categories: _categories,
      substitutes: _substitutes,
      ...input
    } = makeIngredient({ name: "Cat's Claw", canonicalName: 'Fixtura testalis' });
    // Why this is story 16's case: the name is one the warning names.
    expect((await duplicatesOf(asUser(B), input.name)).length).toBeGreaterThan(0);

    const created = await createWorkspaceIngredient(asUser(B), WORKSPACE_W_ID, input);

    expect(await duplicatesOf(asUser(B), input.name)).toContainEqual({
      id: created.id,
      name: "Cat's Claw",
      canonicalName: 'Fixtura testalis',
    });
  });
});

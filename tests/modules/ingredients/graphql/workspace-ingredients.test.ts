import { createYoga } from 'graphql-yoga';
import { GraphQLInputObjectType, isNonNullType } from 'graphql';
import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { maskedErrors } from '@/graphql/errors';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import type { Session } from '@/lib/session';
import { toValidationIssues } from '@/lib/validation';
import { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { noSender } from '../../../support/email-verification';
import { type IngredientFixture, type Overrides, makeIngredient } from '../../../support/fixtures';
import type { Context } from '@/graphql/types';
import type { Answer, WorkspaceIngredientNode } from './types';

// Stories 15 and 34 over the wire: the two mutations a coven's ingredient form
// saves through. Run through Yoga with the route's own error mapping, so a
// refusal is asserted as the browser receives it — `extensions.code` and
// `fieldErrors` — rather than as the thrown type. The service's own rules are
// workspace-ingredients.test.ts's; this file holds the transport's half.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

const yoga = createYoga<Context>({ schema, maskedErrors, logging: false });

async function run<T>(
  session: Session | null,
  query: string,
  variables: Record<string, unknown>,
): Promise<Answer<T>> {
  const response = await yoga.fetch(
    'http://localhost/graphql',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    },
    { session, loaders: createLoaders(session), emailVerification: noSender },
  );
  return (await response.json()) as Answer<T>;
}

const FIELDS = `
  id name slug canonicalName nomenclature form description element planets zodiacSigns
  deities colors safetyNotes substitutes { name ingredient { id } } isGlobal folkNames
  categories { name }
  audit { createdBy updatedBy }
`;

const CREATE = `mutation ($workspaceId: ID!, $input: IngredientInput!) {
  createWorkspaceIngredient(workspaceId: $workspaceId, input: $input) { ${FIELDS} }
}`;

const UPDATE = `mutation ($workspaceId: ID!, $id: ID!, $input: IngredientUpdateInput!) {
  updateIngredient(workspaceId: $workspaceId, id: $id, input: $input) { ${FIELDS} }
}`;

const READ = `query ($id: ID!, $workspaceId: ID) {
  ingredient(id: $id, workspaceId: $workspaceId) { ${FIELDS} }
}`;

const create = (
  session: Session | null,
  input: Record<string, unknown>,
  workspaceId = WORKSPACE_W_ID,
) =>
  run<{ createWorkspaceIngredient: WorkspaceIngredientNode }>(session, CREATE, {
    workspaceId,
    input,
  });

const update = (
  session: Session | null,
  id: string,
  input: Record<string, unknown>,
  workspaceId = WORKSPACE_W_ID,
) =>
  run<{ updateIngredient: WorkspaceIngredientNode }>(session, UPDATE, { workspaceId, id, input });

const read = (session: Session | null, id: string) =>
  run<{ ingredient: WorkspaceIngredientNode }>(session, READ, { id, workspaceId: WORKSPACE_W_ID });

/** A W-local fixture: no formal name, and so `none`, unless one is stated. */
function local(overrides: Overrides<IngredientFixture> = {}): IngredientFixture {
  const nomenclature = overrides.canonicalName ? 'botanical' : 'none';
  return makeIngredient({ workspaceId: WORKSPACE_W_ID, nomenclature, ...overrides });
}

const seed = (fixture: IngredientFixture) => insertIngredient(sql, fixture, A.id);

/**
 * The whole ingredient as the update input takes it: every field sent, and
 * an empty value where the fixture has none.
 */
function wholeInput(fixture: IngredientFixture): Record<string, unknown> {
  return {
    name: fixture.name,
    canonicalName: fixture.canonicalName ?? '',
    nomenclature: fixture.nomenclature,
    form: fixture.form ?? '',
    description: fixture.description ?? '',
    element: fixture.element,
    planets: fixture.planets ?? [],
    zodiacSigns: fixture.zodiacSigns ?? [],
    deities: fixture.deities ?? [],
    colors: fixture.colors ?? [],
    safetyNotes: fixture.safetyNotes ?? '',
    substitutes: fixture.substitutes.map((name) => ({ name })),
    folkNames: fixture.folkNames,
  };
}

async function rowOf(id: string) {
  const [row] = await sql`select *, xmin::text as xmin from ingredients where id = ${id}`;
  return row;
}

const countIngredients = async () => {
  const [row] = await sql`select count(*)::int as n from ingredients`;
  return row.n as number;
};

/** The live folk names, with the transaction that wrote each. */
const folkNameRows = (ingredientId: string) => sql`
  select name, created_by, xmin::text as xmin from ingredient_folk_names
  where ingredient_id = ${ingredientId} and deleted_at is null order by name`;

describe('createWorkspaceIngredient', () => {
  it('saves a stub with only a name in the coven, as story 29 does', async () => {
    const result = await create(asUser(B), { name: 'Testwort' });

    expect(result.errors).toBeUndefined();
    expect(result.data?.createWorkspaceIngredient).toMatchObject({
      name: 'Testwort',
      nomenclature: 'none',
      canonicalName: null,
      isGlobal: false,
      folkNames: [],
    });
    const created = result.data?.createWorkspaceIngredient as WorkspaceIngredientNode;
    expect((await rowOf(created.id)).workspace_id).toBe(WORKSPACE_W_ID);
  });

  it('answers the entity as a fresh read would, children included, so the client needs no refetch', async () => {
    const mockleaf = await seed(makeIngredient({ name: 'Mockleaf', nomenclature: 'none' }));
    const result = await create(asUser(B), {
      name: 'Testwort',
      canonicalName: 'Fixtura testalis',
      nomenclature: 'botanical',
      form: 'root',
      element: 'water',
      planets: ['Venus', 'Moon'],
      zodiacSigns: ['Taurus', 'Cancer'],
      deities: ['Testara'],
      colors: ['Green', 'Silver'],
      folkNames: ['Test Root', 'Fixture Herb'],
      substitutes: [{ name: 'Zest Root' }, { ingredientId: mockleaf }],
    });

    const answered = result.data?.createWorkspaceIngredient as WorkspaceIngredientNode;
    // Alphabetical by the name each shows, a link leading to its ingredient.
    expect(answered.substitutes).toEqual([
      { name: 'Mockleaf', ingredient: { id: mockleaf } },
      { name: 'Zest Root', ingredient: null },
    ]);
    expect(answered).toMatchObject({
      planets: ['Venus', 'Moon'],
      zodiacSigns: ['Taurus', 'Cancer'],
      colors: ['Green', 'Silver'],
    });
    expect([...answered.folkNames].sort()).toEqual(['Fixture Herb', 'Test Root']);
    const fresh = await read(asUser(B), answered.id);
    expect(fresh.errors).toBeUndefined();
    expect(answered).toEqual(fresh.data?.ingredient);
  });

  it('stamps the ingredient and its folk names from the session, in one transaction', async () => {
    const result = await create(asUser(B), { name: 'Testwort', folkNames: ['Test Root'] });

    const answered = result.data?.createWorkspaceIngredient as WorkspaceIngredientNode;
    expect(answered.audit).toEqual({ createdBy: B.id, updatedBy: B.id });
    const row = await rowOf(answered.id);
    expect(row).toMatchObject({ created_by: B.id, updated_by: B.id });
    // One round trip: the folk name was written by the ingredient's own transaction.
    expect(await folkNameRows(answered.id)).toEqual([
      { name: 'Test Root', created_by: B.id, xmin: row.xmin },
    ]);
  });

  // Nothing in the input names a stamp or a tier: both are the session's and
  // the proof's, and the schema has no field to carry either.
  it.each([
    ['an audit stamp', { createdBy: A.id }],
    ['a tier', { workspaceId: WORKSPACE_X_ID }],
  ])('refuses an input carrying %s, writing nothing', async (_what, extra) => {
    const result = await create(asUser(B), { name: 'Testwort', ...extra });

    expect(result.data ?? null).toBeNull();
    expect(result.errors?.[0]?.message).toMatch(/is not defined by type "IngredientInput"/);
    expect(await countIngredients()).toBe(0);
  });

  it('answers a Zod failure as VALIDATION, one fieldError per issue, paths preserved', async () => {
    const input = {
      name: 'Testwort',
      nomenclature: 'botanical',
      folkNames: ['Test Root', 'test root'],
    };
    // Two issues at two depths, from the schema the form also runs.
    const parsed = LocalIngredientInput.safeParse(input);
    expect(parsed.success).toBe(false);
    const issues = toValidationIssues(parsed.error!);
    expect(issues.map((issue) => issue.path)).toEqual([['canonicalName'], ['folkNames', 1]]);

    const result = await create(asUser(B), input);

    expect(result.data).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0]).toMatchObject({
      path: ['createWorkspaceIngredient'],
      extensions: { code: 'VALIDATION', fieldErrors: issues },
    });
    expect(await countIngredients()).toBe(0);
  });

  // A repeat is the schema's refusal, and a link outside the compendium and
  // W the service's; both reach the form as a field error on the entry,
  // never as the unique index's 23505 or a bare Forbidden.
  it.each([
    ['a repeated name', () => [{ name: 'Zest Root' }, { name: 'zest root' }]],
    [
      'a link to another coven’s ingredient',
      (elsewhere: string) => [{ name: 'Zest Root' }, { ingredientId: elsewhere }],
    ],
  ])('answers %s as VALIDATION pathed to the entry, writing nothing', async (_case, list) => {
    const elsewhere = await seed(local({ name: 'Xenoleaf', workspaceId: WORKSPACE_X_ID }));

    const result = await create(asUser(B), { name: 'Testwort', substitutes: list(elsewhere) });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: [expect.objectContaining({ path: ['substitutes', 1] })],
    });
    expect(await countIngredients()).toBe(1);
  });

  it('refuses a viewer, who is a member and reads the coven, writing nothing', async () => {
    // Why it could have succeeded: C holds a live membership of W and reads its entries.
    const id = await seed(local({ name: 'Rootwort' }));
    expect((await read(asUser(C), id)).data?.ingredient).toMatchObject({ name: 'Rootwort' });

    const result = await create(asUser(C), { name: 'Testwort' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(await countIngredients()).toBe(1);
  });

  it.each([
    ['a signed-out caller', null],
    ['a member of another coven', asUser(D)],
    ['a site admin', asUser(E)],
  ])('refuses %s', async (_who, session) => {
    // Why it could have succeeded: the same call as a member of W writes.
    expect((await create(asUser(B), { name: 'Rootwort' })).errors).toBeUndefined();

    const result = await create(session, { name: 'Testwort' });

    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(await countIngredients()).toBe(1);
  });
});

describe('updateIngredient', () => {
  it('replaces the row with the input and answers it as a fresh read would', async () => {
    const id = await seed(
      local({
        description: 'Dug at dusk',
        planets: ['Moon', 'Venus'],
        folkNames: ['Dropped Root'],
      }),
    );

    const result = await update(
      asUser(B),
      id,
      wholeInput(
        local({
          name: 'Testroot',
          form: 'root',
          element: 'fire',
          planets: ['Mars'],
          colors: ['Red', 'Black'],
          folkNames: ['Added Root'],
        }),
      ),
    );

    expect(result.errors).toBeUndefined();
    const answered = result.data?.updateIngredient as WorkspaceIngredientNode;
    expect(answered).toMatchObject({
      id,
      name: 'Testroot',
      form: 'root',
      element: 'fire',
      description: null,
      planets: ['Mars'],
      colors: ['Red', 'Black'],
      folkNames: ['Added Root'],
      audit: { createdBy: A.id, updatedBy: B.id },
    });
    expect(answered).toEqual((await read(asUser(B), id)).data?.ingredient);
  });

  it('writes the folk names in the ingredient’s own transaction', async () => {
    const id = await seed(local({ folkNames: ['Dropped Root'] }));

    await update(asUser(B), id, wholeInput(local({ folkNames: ['Added Root'] })));

    const row = await rowOf(id);
    expect(row.updated_by).toBe(B.id);
    expect(await folkNameRows(id)).toEqual([
      { name: 'Added Root', created_by: B.id, xmin: row.xmin },
    ]);
  });

  it('clears a text field sent as "", a list sent as [], and element sent as null', async () => {
    const id = await seed(
      local({
        form: 'root',
        description: 'Dug at dusk',
        element: 'water',
        planets: ['Moon'],
        zodiacSigns: ['Cancer'],
        deities: ['Testara'],
        colors: ['Silver'],
        substitutes: ['Mock Root'],
        folkNames: ['Test Root'],
      }),
    );

    const result = await update(asUser(B), id, wholeInput(local({ form: null, element: null })));

    expect(result.errors).toBeUndefined();
    expect(result.data?.updateIngredient).toMatchObject({
      form: null,
      description: null,
      element: null,
      planets: null,
      zodiacSigns: null,
      deities: null,
      colors: null,
      substitutes: [],
      folkNames: [],
    });
    // Cleared to NULL, not to an empty array: "none" has one representation.
    expect(await rowOf(id)).toMatchObject({
      planets: null,
      zodiac_signs: null,
      deities: null,
      colors: null,
    });
    const [{ n }] = await sql`
      select count(*)::int as n from ingredient_substitutes
      where ingredient_id = ${id} and deleted_at is null`;
    expect(n).toBe(0);
  });

  // `element` is an enum, which has no empty value to send, so it is the one
  // field left nullable — and so the one a caller may leave out.
  it('declares every field of its input required, but element', () => {
    const input = schema.getType('IngredientUpdateInput');
    expect(input).toBeInstanceOf(GraphQLInputObjectType);
    const fields = Object.values((input as GraphQLInputObjectType).getFields());
    // Precondition: the input is the whole ingredient, not a stub.
    expect(fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(['name', 'canonicalName', 'form', 'element', 'folkNames']),
    );

    expect(fields.filter((field) => !isNonNullType(field.type)).map((field) => field.name)).toEqual(
      ['element'],
    );
  });

  it('refuses an input that leaves a field out, changing nothing', async () => {
    const id = await seed(local({ form: 'root' }));
    const { form: _form, ...withoutForm } = wholeInput(local({ name: 'Testroot', form: 'root' }));
    // Why it could have succeeded: the same input with the field sent is saved.
    const sent = await update(asUser(B), id, { ...withoutForm, form: 'root', name: 'Testwort' });
    expect(sent.errors).toBeUndefined();

    const result = await update(asUser(B), id, withoutForm);

    expect(result.data ?? null).toBeNull();
    expect(result.errors?.[0]?.message).toMatch(
      /Field "form" of required type "String!" was not provided/,
    );
    expect(await rowOf(id)).toMatchObject({ name: 'Testwort', form: 'root' });
  });

  it('clears element when it is left out', async () => {
    const id = await seed(local({ element: 'water' }));
    const { element: _element, ...withoutElement } = wholeInput(local({ element: 'water' }));

    const result = await update(asUser(B), id, withoutElement);

    expect(result.errors).toBeUndefined();
    expect((await rowOf(id)).element).toBeNull();
  });

  it('answers a Zod failure as VALIDATION on the field, changing nothing', async () => {
    const id = await seed(local());

    const result = await update(asUser(B), id, wholeInput(local({ name: '   ' })));

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions).toEqual({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['name'], message: 'Give the ingredient a name' }],
    });
    expect((await rowOf(id)).name).toBe('Testwort');
  });

  it('refuses a viewer, who reads the entry, changing nothing', async () => {
    const id = await seed(local());
    // Why it could have succeeded: the row is live and C reads it by this id.
    expect((await read(asUser(C), id)).data?.ingredient).toMatchObject({ id });

    const result = await update(asUser(C), id, wholeInput(local({ name: 'Nope' })));

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect((await rowOf(id)).name).toBe('Testwort');
  });

  describe('a W ingredient named by direct id from outside W', () => {
    let id: string;

    beforeEach(async () => {
      id = await seed(local());
      // Why the refusals could have passed wrongly: the id is live, and W's own member rewrites it.
      expect((await update(asUser(B), id, wholeInput(local()))).errors).toBeUndefined();
    });

    it('is NOT_FOUND under another coven’s valid proof', async () => {
      const result = await update(
        asUser(D),
        id,
        wholeInput(local({ name: 'Nope' })),
        WORKSPACE_X_ID,
      );

      expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
      expect((await rowOf(id)).name).toBe('Testwort');
    });

    it.each([
      ['a signed-out caller', null],
      ['a member of another coven naming W', asUser(D)],
      ['a site admin', asUser(E)],
    ])('is FORBIDDEN to %s', async (_who, session) => {
      const result = await update(session, id, wholeInput(local({ name: 'Nope' })));

      expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      expect((await rowOf(id)).name).toBe('Testwort');
    });
  });

  it('is NOT_FOUND for an id that is not an id, not a driver error', async () => {
    const result = await update(asUser(B), 'not-an-ingredient', wholeInput(local()));

    expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });

  // Root mutation fields run one after another in one request, so the second
  // must not answer the folk names the first one read.
  it('answers its own folk names and substitutes when one request updates the entry twice', async () => {
    const id = await seed(local());
    const twice = `mutation ($workspaceId: ID!, $id: ID!, $first: IngredientUpdateInput!, $second: IngredientUpdateInput!) {
      first: updateIngredient(workspaceId: $workspaceId, id: $id, input: $first) {
        folkNames substitutes { name }
      }
      second: updateIngredient(workspaceId: $workspaceId, id: $id, input: $second) {
        folkNames substitutes { name }
      }
    }`;

    const result = await run<{ first: WorkspaceIngredientNode; second: WorkspaceIngredientNode }>(
      asUser(B),
      twice,
      {
        workspaceId: WORKSPACE_W_ID,
        id,
        first: wholeInput(local({ folkNames: ['First Root'], substitutes: ['First Zest'] })),
        second: wholeInput(local({ folkNames: ['Second Root'], substitutes: ['Second Zest'] })),
      },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.first.folkNames).toEqual(['First Root']);
    expect(result.data?.second.folkNames).toEqual(['Second Root']);
    expect(result.data?.first.substitutes).toEqual([{ name: 'First Zest' }]);
    expect(result.data?.second.substitutes).toEqual([{ name: 'Second Zest' }]);
  });
});

// Story 25 over the wire. The answer is the deleted id rather than the
// entity: a list evicts a row by its id, and a deleted ingredient's children
// would read as empty (claude-docs/graphql/schema.md, "The workspace ingredient mutations").
describe('deleteIngredient', () => {
  const DELETE = `mutation ($workspaceId: ID!, $id: ID!) {
    deleteIngredient(workspaceId: $workspaceId, id: $id)
  }`;

  const remove = (session: Session | null, id: string, workspaceId = WORKSPACE_W_ID) =>
    run<{ deleteIngredient: string }>(session, DELETE, { workspaceId, id });

  it('lets a member soft-delete one, answering its id', async () => {
    const id = await seed(local());

    expect(await remove(asUser(B), id)).toEqual({ data: { deleteIngredient: id } });

    expect(await rowOf(id)).toMatchObject({ deleted_by: B.id });
    expect((await read(asUser(B), id)).errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });

  it('is FORBIDDEN to a viewer, and the row stays live', async () => {
    const id = await seed(local());
    // Why it could have succeeded: the row is live and C reads it by this id.
    expect((await read(asUser(C), id)).data?.ingredient).toMatchObject({ id });

    const result = await remove(asUser(C), id);

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect((await rowOf(id)).deleted_at).toBeNull();
  });

  describe('a W ingredient named by direct id from outside W', () => {
    let id: string;

    beforeEach(async () => {
      id = await seed(local());
      // Why the refusals could have passed wrongly: the id is live, and W's own member reads it.
      expect((await read(asUser(B), id)).data?.ingredient).toMatchObject({ id });
    });

    it('is NOT_FOUND under another coven’s valid proof', async () => {
      const result = await remove(asUser(D), id, WORKSPACE_X_ID);

      expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
      expect((await rowOf(id)).deleted_at).toBeNull();
    });

    it.each([
      ['a signed-out caller', null],
      ['a member of another coven naming W', asUser(D)],
      ['a site admin', asUser(E)],
    ])('is FORBIDDEN to %s', async (_who, session) => {
      const result = await remove(session, id);

      expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      expect((await rowOf(id)).deleted_at).toBeNull();
    });
  });

  it('is NOT_FOUND for a compendium entry, which stays live, and for an id that is not an id', async () => {
    const id = await seed(makeIngredient());

    expect((await remove(asUser(A), id)).errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    expect((await rowOf(id)).deleted_at).toBeNull();
    expect((await remove(asUser(A), 'not-an-ingredient')).errors?.[0]?.extensions?.code).toBe(
      'NOT_FOUND',
    );
  });
});

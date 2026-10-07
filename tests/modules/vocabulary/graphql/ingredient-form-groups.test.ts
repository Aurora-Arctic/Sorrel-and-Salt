import { graphql } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { maskedErrors } from '@/graphql/errors';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import type { Session } from '@/lib/session';
import { formSlug, slugify } from '@/lib/slugify';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { noSender } from '../../../support/email-verification';
import type { Context } from '@/graphql/types';
import type { Answer, FormGroupNode } from './types';

// M5.6b's three form-group writes, run through Yoga with the route's own error
// mapping, so a refusal is asserted as the browser receives it. The services'
// own rules — the forms' slugs following a rename, and moving with a delete —
// are services/ingredient-form-groups.test.ts's.

let sql: ReturnType<typeof postgres>;
beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});
afterAll(() => sql.end());

let substance: string;
beforeAll(async () => {
  const [row] = await sql<{ id: string }[]>`
    select id from ingredient_form_groups where name = 'Substance' and deleted_at is null`;
  substance = row.id;
});

beforeEach(async () => {
  await sql`delete from ingredient_forms where name like 'Fixture%'`;
  await sql`delete from ingredient_form_groups where name like 'Fixture %'`;
});

const yoga = createYoga<Context>({ schema, maskedErrors, logging: false });

async function send<T>(
  session: Session | null,
  query: string,
  variables: Record<string, unknown> = {},
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

const FIELDS = 'id name slug description';
const CREATE = `mutation ($input: IngredientFormGroupInput!) {
  createIngredientFormGroup(input: $input) { ${FIELDS} }
}`;
const UPDATE = `mutation ($id: ID!, $input: IngredientFormGroupInput!) {
  updateIngredientFormGroup(id: $id, input: $input) { ${FIELDS} }
}`;
const DELETE =
  'mutation ($id: ID!, $moveTo: ID) { deleteIngredientFormGroup(id: $id, moveTo: $moveTo) }';

const input = (name = 'Fixture Matter') => ({ name, description: 'Made over the wire' });

async function seedGroup(name: string): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into ingredient_form_groups (name, slug, description, created_by, updated_by)
    values (${name}, ${slugify(name)}, 'Seeded', ${E.id}, ${E.id})
    returning id`;
  return row.id;
}

async function seedForm(name: string, groupId: string, groupName: string): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into ingredient_forms (name, slug, description, group_id, created_by, updated_by)
    values (${name}, ${formSlug(name, groupName)}, 'Seeded', ${groupId}, ${E.id}, ${E.id})
    returning id`;
  return row.id;
}

const groupOf = async (id: string) =>
  (await sql`select * from ingredient_form_groups where id = ${id}`)[0];

describe('createIngredientFormGroup', () => {
  it('writes one for a site admin', async () => {
    const result = await send<{ createIngredientFormGroup: FormGroupNode }>(asUser(E), CREATE, {
      input: input(),
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.createIngredientFormGroup).toMatchObject({
      name: 'Fixture Matter',
      slug: 'fixture-matter',
    });
  });

  it('refuses every non-admin, the coven owner A included, and a signed-out request, as FORBIDDEN, writing nothing', async () => {
    for (const session of [asUser(A), asUser(B), asUser(C), asUser(D), null]) {
      const result = await send(session, CREATE, { input: input() });
      expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    }
    expect(
      await sql`select 1 from ingredient_form_groups where name = 'Fixture Matter'`,
    ).toHaveLength(0);
  });
});

describe('updateIngredientFormGroup', () => {
  it("rewrites one for a site admin, and a form's group read after it in the same request reads the new name", async () => {
    const id = await seedGroup('Fixture Matter');
    await seedForm('Fixture Shard', id, 'Fixture Matter');
    const session = asUser(E);
    const context = { session, loaders: createLoaders(session), emailVerification: noSender };
    const READ = `query { ingredientFormValues(query: "Fixture Shard") { edges { node { slug group { name } } } } }`;
    const before = await graphql({ schema, source: READ, contextValue: context });
    expect(before.data).toEqual({
      ingredientFormValues: {
        edges: [
          { node: { slug: 'fixture-shard-fixture-matter', group: { name: 'Fixture Matter' } } },
        ],
      },
    });

    const result = await graphql({
      schema,
      source: UPDATE,
      variableValues: { id, input: input('Fixture Stuff') },
      contextValue: context,
    });
    const after = await graphql({ schema, source: READ, contextValue: context });

    expect(result.errors).toBeUndefined();
    expect(after.data).toEqual({
      ingredientFormValues: {
        edges: [
          { node: { slug: 'fixture-shard-fixture-stuff', group: { name: 'Fixture Stuff' } } },
        ],
      },
    });
  });

  it('refuses every non-admin and a signed-out request as FORBIDDEN, leaving the row; answers an unknown id as NOT_FOUND', async () => {
    const id = await seedGroup('Fixture Kept');
    const before = await groupOf(id);

    for (const session of [asUser(A), asUser(B), asUser(C), asUser(D), null]) {
      const refused = await send(session, UPDATE, { id, input: input() });
      expect(refused.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    }
    const missing = await send(asUser(E), UPDATE, { id: 'not-a-uuid', input: input() });

    expect(missing.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    expect(await groupOf(id)).toEqual(before);
  });
});

describe('deleteIngredientFormGroup', () => {
  it('answers a group with forms and no `moveTo` as VALIDATION on `moveTo`, and moves them when given one', async () => {
    const id = await seedGroup('Fixture Matter');
    const shard = await seedForm('Fixture Shard', id, 'Fixture Matter');

    const refused = await send(asUser(E), DELETE, { id });
    const moved = await send<{ deleteIngredientFormGroup: string }>(asUser(E), DELETE, {
      id,
      moveTo: substance,
    });

    expect(refused.errors?.[0]?.extensions).toEqual({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['moveTo'], message: 'Choose a group to move its 1 form to' }],
    });
    expect(moved.data?.deleteIngredientFormGroup).toBe(id);
    const [form] = await sql`select group_id, slug from ingredient_forms where id = ${shard}`;
    expect(form).toEqual({ group_id: substance, slug: 'fixture-shard-substance' });
  });

  it('refuses every non-admin and a signed-out request as FORBIDDEN, leaving the row live', async () => {
    const id = await seedGroup('Fixture Standing');

    for (const session of [asUser(A), asUser(B), asUser(C), asUser(D), null]) {
      const result = await send(session, DELETE, { id });
      expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    }
    expect((await groupOf(id)).deleted_at).toBeNull();
  });
});

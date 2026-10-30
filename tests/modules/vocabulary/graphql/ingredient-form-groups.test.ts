import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { createLoaders } from '@/graphql/loaders';
import { formSlug, slugify } from '@/lib/slugify';
import { E, asUser } from '../../../support/as-user';
import { run } from '../../../support/graphql/run';
import type { FormGroupNode } from './types';

// The three form-group writes over the wire: the transport's half (claude-docs/testing/layer-ownership.md).
// That is the loaders cleared by a write, `moveTo` reaching the delete, and per write one refusal per error code. Roles and the services' own rules are services/ingredient-form-groups.test.ts's;
// signed-out and non-admin scope refusals are tests/db/graphql-query-scopes.test.ts's.

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

const FIELDS = 'id name slug description icon';
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
    const result = await run<{ createIngredientFormGroup: FormGroupNode }>(asUser(E), CREATE, {
      input: input(),
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.createIngredientFormGroup).toMatchObject({
      name: 'Fixture Matter',
      slug: 'fixture-matter',
    });
  });

  it('answers a slug collision as VALIDATION on `name`, writing nothing', async () => {
    await seedGroup('Fixture Matter');

    const result = await run(asUser(E), CREATE, { input: input('Fixture-Matter') });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['name'] }],
    });
    expect(
      await sql`select 1 from ingredient_form_groups where name = 'Fixture-Matter'`,
    ).toHaveLength(0);
  });
});

// The icon standing for the group, an enum on the wire as in the
// table. Which values the service takes, and that an absent one clears, are
// the service test's; here, that the enum carries them both ways.
describe('icon', () => {
  it('is written and read back over the wire, and cleared by a null', async () => {
    const created = await run<{ createIngredientFormGroup: FormGroupNode }>(asUser(E), CREATE, {
      input: { ...input(), icon: 'curio' },
    });
    const id = created.data?.createIngredientFormGroup.id as string;
    expect(created.data?.createIngredientFormGroup.icon).toBe('curio');

    const cleared = await run<{ updateIngredientFormGroup: FormGroupNode }>(asUser(E), UPDATE, {
      id,
      input: { ...input(), icon: null },
    });

    expect(cleared.errors).toBeUndefined();
    expect(cleared.data?.updateIngredientFormGroup.icon).toBeNull();
    expect((await groupOf(id)).icon).toBeNull();
  });

  it('refuses a literal that is not one of the six before any resolver runs, writing nothing', async () => {
    const result = await run(
      asUser(E),
      `mutation {
        createIngredientFormGroup(
          input: { name: "Fixture Matter", description: "Made over the wire", icon: banana }
        ) { id }
      }`,
    );

    expect(result.data ?? null).toBeNull();
    expect(result.errors?.[0]?.extensions?.code).toBe('GRAPHQL_VALIDATION_FAILED');
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
    // One set of loaders across the three, so the read before fills the cache.
    const context = { loaders: createLoaders(session) };
    const READ = `query { ingredientFormValues(query: "Fixture Shard") { edges { node { slug group { name } } } } }`;
    const before = await run(session, READ, {}, context);
    expect(before.data).toEqual({
      ingredientFormValues: {
        edges: [
          { node: { slug: 'fixture-shard-fixture-matter', group: { name: 'Fixture Matter' } } },
        ],
      },
    });

    const result = await run(session, UPDATE, { id, input: input('Fixture Stuff') }, context);
    const after = await run(session, READ, {}, context);

    expect(result.errors).toBeUndefined();
    expect(after.data).toEqual({
      ingredientFormValues: {
        edges: [
          { node: { slug: 'fixture-shard-fixture-stuff', group: { name: 'Fixture Stuff' } } },
        ],
      },
    });
  });

  it('answers an unknown id as NOT_FOUND', async () => {
    const missing = await run(asUser(E), UPDATE, { id: 'not-a-uuid', input: input() });

    expect(missing.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });

  it("answers a rename onto another group's address as VALIDATION on `name`, leaving the row", async () => {
    const id = await seedGroup('Fixture Kept');
    await seedGroup('Fixture Taken');
    const before = await groupOf(id);

    const result = await run(asUser(E), UPDATE, { id, input: input('Fixture-Taken') });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['name'] }],
    });
    expect(await groupOf(id)).toEqual(before);
  });
});

describe('deleteIngredientFormGroup', () => {
  it('answers a group with forms and no `moveTo` as VALIDATION on `moveTo`, and moves them when given one', async () => {
    const id = await seedGroup('Fixture Matter');
    const shard = await seedForm('Fixture Shard', id, 'Fixture Matter');

    const refused = await run(asUser(E), DELETE, { id });
    const moved = await run<{ deleteIngredientFormGroup: string }>(asUser(E), DELETE, {
      id,
      moveTo: substance,
    });

    expect(refused.errors?.[0]?.extensions).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['moveTo'] }],
    });
    expect(moved.data?.deleteIngredientFormGroup).toBe(id);
    const [form] = await sql`select group_id, slug from ingredient_forms where id = ${shard}`;
    expect(form).toEqual({ group_id: substance, slug: 'fixture-shard-substance' });
  });

  it('answers an unknown id as NOT_FOUND', async () => {
    const result = await run(asUser(E), DELETE, { id: 'not-a-uuid' });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });
});

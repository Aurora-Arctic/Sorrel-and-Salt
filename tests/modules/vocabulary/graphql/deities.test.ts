import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { createLoaders } from '@/graphql/loaders';
import { deitySlug, slugify } from '@/lib/slugify';
import { A, E, asUser } from '../../../support/as-user';
import { insertDeityLink, insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';
import type { DeityNode, FilteredDeities } from './types';

// `deities` and `deityTraditions`, the curated deity vocabulary as the admin
// pages read it, answered to a signed-out visitor (MB.80), and MB.132's six
// admin writes. This file holds the transport's half
// (claude-docs/testing/layer-ownership.md): a filtered page and its count,
// each deity's tradition, `moveTo` reaching the delete, the loaders cleared
// by a write, and per write one refusal per error code, read as the browser
// reads it. Which roles are refused and the services' own rules are
// services/deities.test.ts's and services/deity-traditions.test.ts's; a
// signed-out caller at every field is tests/db/graphql-query-scopes.test.ts's.

let sql: ReturnType<typeof postgres>;
beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});
afterAll(() => sql.end());

let greek: string;
beforeAll(async () => {
  const [row] = await sql<{ id: string }[]>`
    select id from deity_traditions where name = 'Greek' and deleted_at is null`;
  greek = row.id;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  await sql`delete from deities where name like 'Fixture%'`;
  await sql`delete from deity_traditions where name like 'Fixture %'`;
});

const DEITY = 'id name slug description tradition { name }';
const CREATE = `mutation ($input: DeityInput!) { createDeity(input: $input) { ${DEITY} } }`;
const UPDATE = `mutation ($id: ID!, $input: DeityInput!) {
  updateDeity(id: $id, input: $input) { ${DEITY} }
}`;
const DELETE = 'mutation ($id: ID!) { deleteDeity(id: $id) }';
const TRADITION = 'id name slug description';
const CREATE_TRADITION = `mutation ($input: DeityTraditionInput!) {
  createDeityTradition(input: $input) { ${TRADITION} }
}`;
const UPDATE_TRADITION = `mutation ($id: ID!, $input: DeityTraditionInput!) {
  updateDeityTradition(id: $id, input: $input) { ${TRADITION} }
}`;
const DELETE_TRADITION =
  'mutation ($id: ID!, $moveTo: ID) { deleteDeityTradition(id: $id, moveTo: $moveTo) }';

const input = (name = 'Fixture Testra', traditionId = greek) => ({
  name,
  description: 'Made over the wire',
  traditionId,
});

async function seedTradition(name: string): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into deity_traditions (name, slug, description, created_by, updated_by)
    values (${name}, ${slugify(name)}, 'Seeded', ${E.id}, ${E.id})
    returning id`;
  return row.id;
}

async function seedDeity(name: string, traditionId = greek): Promise<string> {
  const [tradition] = await sql<{ name: string }[]>`
    select name from deity_traditions where id = ${traditionId}`;
  const [row] = await sql<{ id: string }[]>`
    insert into deities (name, slug, description, tradition_id, created_by, updated_by)
    values (${name}, ${deitySlug(name, tradition.name)}, 'Seeded', ${traditionId}, ${E.id}, ${E.id})
    returning id`;
  return row.id;
}

/** A compendium entry linking the deity; the entry's id. */
async function picking(deityId: string): Promise<string> {
  const id = await insertIngredient(
    sql,
    makeIngredient({ name: 'Testwort', nomenclature: 'none' }),
    A.id,
  );
  await insertDeityLink(sql, id, deityId, 0, A.id);
  return id;
}

const deityOf = async (id: string) => (await sql`select * from deities where id = ${id}`)[0];

// The one non-admin each write refuses here, since `authScopes: { admin: true }`
// is a gate of its own in front of the service: a coven's owner, the most a
// workspace role grants, which is still not the site role these writes turn
// on. Every other role is the services' tests'.
const OWNER = asUser(A);

// Why the refusals could have been something else: the session the scope
// reads says `user`, and E's says `admin`.
it('is testing a session whose site role is `user`, beside an admin', () => {
  expect(OWNER.role).toBe('user');
  expect(asUser(E).role).toBe('admin');
});

describe('deities', () => {
  it('pages the filter it is given, each deity with its tradition, and counts it', async () => {
    await seedDeity('Fixture Testra');
    await seedDeity('Fixture Mockra', await seedTradition('Fixture Folk'));

    const result = await run<{ deities: FilteredDeities }>(
      null,
      `query ($traditionId: ID) {
        deities(query: "fixture", traditionId: $traditionId, first: 10) {
          totalCount edges { node { name tradition { name } } }
        }
      }`,
      { traditionId: greek },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data?.deities).toEqual({
      totalCount: 1,
      edges: [{ node: { name: 'Fixture Testra', tradition: { name: 'Greek' } } }],
    });
  });
});

describe('deityTraditions', () => {
  it('pages the live traditions by name', async () => {
    const result = await run<{ deityTraditions: { edges: { node: { name: string } }[] } }>(
      null,
      '{ deityTraditions(first: 3) { edges { node { name } } } }',
    );
    const expected = await sql<{ name: string }[]>`
      select name from deity_traditions where deleted_at is null order by name, id limit 3`;

    expect(result.errors).toBeUndefined();
    expect(result.data?.deityTraditions.edges.map((edge) => edge.node.name)).toEqual(
      expected.map((row) => row.name),
    );
  });
});

describe('createDeity', () => {
  it('writes one for a site admin', async () => {
    const result = await run<{ createDeity: DeityNode }>(asUser(E), CREATE, { input: input() });

    expect(result.errors).toBeUndefined();
    expect(result.data?.createDeity).toMatchObject({
      name: 'Fixture Testra',
      slug: 'fixture-testra-greek',
      tradition: { name: 'Greek' },
    });
  });

  it('refuses a coven owner as FORBIDDEN, writing nothing', async () => {
    const result = await run(OWNER, CREATE, { input: input() });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(await sql`select 1 from deities where name = 'Fixture Testra'`).toHaveLength(0);
  });

  it('answers a slug collision as VALIDATION on `name`, writing nothing', async () => {
    await seedDeity('Fixture Testra');

    const result = await run(asUser(E), CREATE, { input: input('Fixture-Testra') });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['name'] }],
    });
    expect(await sql`select 1 from deities where name = 'Fixture-Testra'`).toHaveLength(0);
  });
});

describe('updateDeity', () => {
  it("rewrites one for a site admin, and an entry's deity read after it in the same request reads the new name", async () => {
    const id = await seedDeity('Fixture Hekate');
    const entry = await picking(id);
    const session = asUser(E);
    // One set of loaders across the three, so the read before fills the cache.
    const context = { loaders: createLoaders(session) };
    const READ = `query ($id: ID!) { ingredient(id: $id) { deities { name deity { name } } } }`;
    const before = await run(session, READ, { id: entry }, context);
    expect(before.data).toEqual({
      ingredient: { deities: [{ name: 'Fixture Hekate', deity: { name: 'Fixture Hekate' } }] },
    });

    const result = await run(session, UPDATE, { id, input: input('Fixture Hecate') }, context);
    const after = await run(session, READ, { id: entry }, context);

    expect(result.errors).toBeUndefined();
    expect(after.data).toEqual({
      ingredient: { deities: [{ name: 'Fixture Hecate', deity: { name: 'Fixture Hecate' } }] },
    });
  });

  it('refuses a coven owner as FORBIDDEN, leaving the row; answers an unknown id as NOT_FOUND', async () => {
    const id = await seedDeity('Fixture Kept');
    const before = await deityOf(id);

    const refused = await run(OWNER, UPDATE, { id, input: input() });
    expect(refused.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    const missing = await run(asUser(E), UPDATE, { id: 'not-a-uuid', input: input() });

    expect(missing.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    expect(await deityOf(id)).toEqual(before);
  });

  it('answers a retired tradition as VALIDATION on `traditionId`, leaving the row', async () => {
    const id = await seedDeity('Fixture Kept');
    const gone = await seedTradition('Fixture Gone');
    await sql`update deity_traditions set deleted_at = now(), deleted_by = ${E.id} where id = ${gone}`;
    const before = await deityOf(id);

    const result = await run(asUser(E), UPDATE, { id, input: input('Fixture Kept', gone) });

    expect(result.errors?.[0]?.extensions).toEqual({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['traditionId'], message: 'Choose a tradition' }],
    });
    expect(await deityOf(id)).toEqual(before);
  });
});

describe('deleteDeity', () => {
  it('deletes one no entry picked, and refuses one a compendium entry picks as FORBIDDEN, naming it', async () => {
    const free = await seedDeity('Fixture Free');
    const held = await seedDeity('Fixture Held');
    await picking(held);

    const deleted = await run<{ deleteDeity: string }>(asUser(E), DELETE, { id: free });
    const refused = await run(asUser(E), DELETE, { id: held });

    expect(deleted.data?.deleteDeity).toBe(free);
    expect(refused.data).toBeNull();
    expect(refused.errors?.[0]).toMatchObject({
      message:
        '"Fixture Held" is among the deities of 1 compendium entry — Testwort (herb). Take it off its deities first.',
      extensions: { code: 'FORBIDDEN' },
    });
    expect((await deityOf(held)).deleted_at).toBeNull();
  });

  it('refuses a coven owner as FORBIDDEN, leaving the row live; answers an unknown id as NOT_FOUND', async () => {
    const id = await seedDeity('Fixture Standing');

    const refused = await run(OWNER, DELETE, { id });
    const missing = await run(asUser(E), DELETE, { id: 'not-a-uuid' });

    expect(refused.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(missing.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    expect((await deityOf(id)).deleted_at).toBeNull();
  });
});

describe('createDeityTradition and updateDeityTradition', () => {
  it("write one for a site admin, and a deity's tradition read after a rename in the same request reads the new name", async () => {
    const session = asUser(E);
    const created = await run<{ createDeityTradition: { id: string; slug: string } }>(
      session,
      CREATE_TRADITION,
      { input: { name: 'Fixture Folk', description: 'Made over the wire' } },
    );
    expect(created.data?.createDeityTradition.slug).toBe('fixture-folk');
    const id = created.data?.createDeityTradition.id as string;
    await seedDeity('Fixture Testra', id);
    const context = { loaders: createLoaders(session) };
    const READ =
      '{ deities(query: "Fixture Testra") { edges { node { slug tradition { name } } } } }';
    await run(session, READ, {}, context);

    const result = await run(
      session,
      UPDATE_TRADITION,
      { id, input: { name: 'Fixture Lore', description: 'Renamed' } },
      context,
    );
    const after = await run(session, READ, {}, context);

    expect(result.errors).toBeUndefined();
    expect(after.data).toEqual({
      deities: {
        edges: [
          { node: { slug: 'fixture-testra-fixture-lore', tradition: { name: 'Fixture Lore' } } },
        ],
      },
    });
  });

  it('refuse a coven owner as FORBIDDEN, and answer a slug collision as VALIDATION on `name`', async () => {
    await seedTradition('Fixture Folk');

    const refused = await run(OWNER, CREATE_TRADITION, {
      input: { name: 'Fixture Other', description: 'x' },
    });
    const collided = await run(asUser(E), CREATE_TRADITION, {
      input: { name: 'Fixture-Folk', description: 'x' },
    });

    expect(refused.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(collided.errors?.[0]?.extensions).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['name'] }],
    });
  });

  it('refuse a coven owner a rename as FORBIDDEN, leaving the row', async () => {
    const id = await seedTradition('Fixture Kept');
    const before = await sql`select name, slug, updated_by from deity_traditions where id = ${id}`;

    const refused = await run(OWNER, UPDATE_TRADITION, {
      id,
      input: { name: 'Fixture Taken', description: 'x' },
    });

    expect(refused.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(await sql`select name, slug, updated_by from deity_traditions where id = ${id}`).toEqual(
      before,
    );
  });
});

describe('deleteDeityTradition', () => {
  it('answers a tradition with deities and no `moveTo` as VALIDATION on `moveTo`, and moves them when given one', async () => {
    const id = await seedTradition('Fixture Folk');
    const deity = await seedDeity('Fixture Testra', id);

    const refused = await run(asUser(E), DELETE_TRADITION, { id });
    const moved = await run<{ deleteDeityTradition: string }>(asUser(E), DELETE_TRADITION, {
      id,
      moveTo: greek,
    });

    expect(refused.errors?.[0]?.extensions).toEqual({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['moveTo'], message: 'Choose a tradition to move its 1 deity to' }],
    });
    expect(moved.data?.deleteDeityTradition).toBe(id);
    expect(await deityOf(deity)).toMatchObject({
      tradition_id: greek,
      slug: 'fixture-testra-greek',
    });
  });

  it('refuses a coven owner as FORBIDDEN; answers an unknown id as NOT_FOUND', async () => {
    const id = await seedTradition('Fixture Standing');

    const refused = await run(OWNER, DELETE_TRADITION, { id });
    const missing = await run(asUser(E), DELETE_TRADITION, { id: 'not-a-uuid' });

    expect(refused.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(missing.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });
});

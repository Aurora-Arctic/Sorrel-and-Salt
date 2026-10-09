import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { slugify } from '@/lib/slugify';
import { A, E, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';
import { run as send } from '../../../support/graphql/run';
import type { AstrologyValueConnection, AstrologyValueNode } from './types';

// `planets` and `zodiacSigns`: the two curated astrology vocabularies as
// `Planet` and `ZodiacSign`, a page at a time, answered to a signed-out
// visitor (MB.80), and MB.95's six admin writes. This file holds the
// transport's half (claude-docs/testing/layer-ownership.md): a page and its
// count, the query reaching the read, and per write one refusal per error
// code, read as the browser reads it. Which roles are refused, a rename
// carried onto the entries and every collision are services/astrology.test.ts's;
// a signed-out caller at every field is tests/db/graphql-query-scopes.test.ts's.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

// The one non-admin each write refuses here, since `authScopes: { admin: true }`
// is a gate of its own in front of the service: a coven's owner, the most a
// workspace role grants, which is still not the site role these writes turn
// on. Every other role is services/astrology.test.ts's.
const OWNER = asUser(A);

// Why the refusals could have been something else: the session the scope
// reads says `user`, and E's says `admin`.
it('is testing a session whose site role is `user`, beside an admin', () => {
  expect(OWNER.role).toBe('user');
  expect(asUser(E).role).toBe('admin');
});

const VOCABULARIES = [
  {
    query: 'planets',
    type: 'Planet',
    table: 'planets',
    field: 'planets',
    listNoun: 'planets',
  },
  {
    query: 'zodiacSigns',
    type: 'ZodiacSign',
    table: 'zodiac_signs',
    field: 'zodiacSigns',
    listNoun: 'zodiac signs',
  },
] as const;

describe.each(VOCABULARIES)('$query', ({ query, type, table, field, listNoun }) => {
  const FIELDS = 'id name slug description';
  const CREATE = `mutation ($input: ${type}Input!) { create${type}(input: $input) { ${FIELDS} } }`;
  const UPDATE = `mutation ($id: ID!, $input: ${type}Input!) {
    update${type}(id: $id, input: $input) { ${FIELDS} }
  }`;
  const DELETE = `mutation ($id: ID!) { delete${type}(id: $id) }`;
  const LIST = `query ($query: String, $first: Int, $after: String) {
    ${query}(query: $query, first: $first, after: $after) {
      totalCount countBefore
      edges { cursor node { ${FIELDS} } }
      pageInfo { hasNextPage endCursor }
    }
  }`;

  beforeEach(async () => {
    await sql`truncate ingredients cascade`;
    await sql`delete from ${sql(table)} where name like 'Fixture%'`;
  });

  const input = (name = 'Fixture Body') => ({ name, description: 'Made over the wire' });

  async function seed(name: string): Promise<string> {
    const slug = slugify(name);
    const [row] = await sql<{ id: string }[]>`
      insert into ${sql(table)} (name, slug, description, created_by, updated_by)
      values (${name}, ${slug}, 'Seeded', ${E.id}, ${E.id})
      returning id`;
    return row.id;
  }

  const rowOf = async (id: string) => (await sql`select * from ${sql(table)} where id = ${id}`)[0];

  describe('the read', () => {
    it('answers a signed-out visitor the live rows by name, counted, a page at a time', async () => {
      const expected = await sql<{ id: string }[]>`
        select id from ${sql(table)} where deleted_at is null order by name, id`;
      expect(expected.length).toBeGreaterThan(10);

      const first = await send<Record<string, AstrologyValueConnection>>(null, LIST, { first: 5 });
      const rest = await send<Record<string, AstrologyValueConnection>>(null, LIST, {
        first: 100,
        after: first.data?.[query].pageInfo.endCursor,
      });

      expect(first.errors).toBeUndefined();
      expect(first.data?.[query]).toMatchObject({
        totalCount: expected.length,
        countBefore: 0,
      });
      expect(rest.data?.[query].countBefore).toBe(5);
      const ids = [...(first.data?.[query].edges ?? []), ...(rest.data?.[query].edges ?? [])].map(
        (edge) => edge.node.id,
      );
      expect(ids).toEqual(expected.map((row) => row.id));
    });

    it('narrows its edges and its count by a name fragment, read literally', async () => {
      await seed('Fixture 100% Bright');
      await seed('Fixture 100x Bright');

      const result = await send<Record<string, AstrologyValueConnection>>(null, LIST, {
        query: ' 100% ',
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.[query].totalCount).toBe(1);
      expect(result.data?.[query].edges.map((edge) => edge.node.name)).toEqual([
        'Fixture 100% Bright',
      ]);
    });
  });

  describe(`create${type}`, () => {
    it('writes one for a site admin, answering it with its slug', async () => {
      const result = await send<Record<string, AstrologyValueNode>>(asUser(E), CREATE, {
        input: input(),
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.[`create${type}`]).toMatchObject({
        name: 'Fixture Body',
        slug: 'fixture-body',
        description: 'Made over the wire',
      });
    });

    it('refuses a coven owner as FORBIDDEN, writing nothing', async () => {
      const result = await send(OWNER, CREATE, { input: input() });

      expect(result.data).toBeNull();
      expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      const rows = await sql`select 1 from ${sql(table)} where name = 'Fixture Body'`;
      expect(rows).toHaveLength(0);
    });

    it("answers a slug collision as VALIDATION on `name`, with the service's message", async () => {
      await seed('Fixture Body');

      const result = await send(asUser(E), CREATE, { input: input('Fixture-Body') });

      expect(result.errors?.[0]?.extensions).toEqual({
        code: 'VALIDATION',
        fieldErrors: [
          {
            path: ['name'],
            message: '"Fixture Body" already has the address "fixture-body" — choose another name',
          },
        ],
      });
    });
  });

  describe(`update${type}`, () => {
    it('rewrites one for a site admin, answering its new slug', async () => {
      const id = await seed('Fixture Old');

      const result = await send<Record<string, AstrologyValueNode>>(asUser(E), UPDATE, {
        id,
        input: input('Fixture New'),
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.[`update${type}`]).toMatchObject({ id, slug: 'fixture-new' });
      expect((await rowOf(id)).name).toBe('Fixture New');
    });

    it('refuses a coven owner by id, as FORBIDDEN, leaving it as it was', async () => {
      const id = await seed('Fixture Kept');
      const before = await rowOf(id);

      const result = await send(OWNER, UPDATE, { id, input: input('Fixture Taken Over') });

      expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      expect(await rowOf(id)).toEqual(before);
    });

    it("answers a rename onto another row's address as VALIDATION on `name`, leaving it as it was", async () => {
      const id = await seed('Fixture Kept');
      await seed('Fixture Taken');
      const before = await rowOf(id);

      const result = await send(asUser(E), UPDATE, { id, input: input('Fixture-Taken') });

      expect(result.data).toBeNull();
      expect(result.errors?.[0]?.extensions).toMatchObject({
        code: 'VALIDATION',
        fieldErrors: [{ path: ['name'] }],
      });
      expect(await rowOf(id)).toEqual(before);
    });

    it('answers an unknown id as NOT_FOUND', async () => {
      const result = await send(asUser(E), UPDATE, { id: 'not-a-uuid', input: input() });

      expect(result.data).toBeNull();
      expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    });
  });

  describe(`delete${type}`, () => {
    it('soft-deletes one for a site admin, answering its id', async () => {
      const id = await seed('Fixture Doomed');

      const result = await send<Record<string, string>>(asUser(E), DELETE, { id });

      expect(result.errors).toBeUndefined();
      expect(result.data?.[`delete${type}`]).toBe(id);
      expect((await rowOf(id)).deleted_by).toBe(E.id);
    });

    it('refuses a coven owner by id, as FORBIDDEN, the row left live', async () => {
      const id = await seed('Fixture Kept');

      const result = await send(OWNER, DELETE, { id });

      expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      expect((await rowOf(id)).deleted_at).toBeNull();
    });

    it('answers an unknown id as NOT_FOUND', async () => {
      const result = await send(asUser(E), DELETE, { id: 'not-a-uuid' });

      expect(result.data).toBeNull();
      expect(result.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    });

    it('answers a held value as FORBIDDEN with the message naming the entry', async () => {
      const id = await seed('Fixture Body');
      await insertIngredient(
        sql,
        makeIngredient({
          name: 'Testwort',
          nomenclature: 'none',
          form: null,
          [field]: ['Fixture Body'],
        }),
        E.id,
      );

      const result = await send(asUser(E), DELETE, { id });

      expect(result.errors?.[0]).toMatchObject({
        message: `"Fixture Body" is among the ${listNoun} of 1 compendium entry — Testwort. Take it off its ${listNoun} first.`,
        extensions: { code: 'FORBIDDEN' },
      });
      expect((await rowOf(id)).deleted_at).toBeNull();
    });
  });
});

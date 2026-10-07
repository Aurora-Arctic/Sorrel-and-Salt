import { createYoga } from 'graphql-yoga';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { maskedErrors } from '@/graphql/errors';
import { createLoaders } from '@/graphql/loaders';
import { schema } from '@/graphql/schema';
import type { Session } from '@/lib/session';
import { slugify } from '@/lib/slugify';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { noSender } from '../../../support/email-verification';
import { makeIngredient } from '../../../support/fixtures';
import type { Context } from '@/graphql/types';
import type { Answer, AstrologyValueConnection, AstrologyValueNode } from './types';

// `planets` and `zodiacSigns`: the two curated astrology vocabularies as
// `Planet` and `ZodiacSign`, a page at a time, answered to a signed-out
// visitor (MB.80), and MB.95's six admin writes, run through Yoga with the
// route's own error mapping, so a refusal is asserted as the browser receives
// it. The services' own rules are services/astrology.test.ts's.

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
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

const VOCABULARIES = [
  {
    query: 'planets',
    type: 'Planet',
    table: 'planets',
    column: 'planets',
    field: 'planets',
    listNoun: 'planets',
  },
  {
    query: 'zodiacSigns',
    type: 'ZodiacSign',
    table: 'zodiac_signs',
    column: 'zodiac_signs',
    field: 'zodiacSigns',
    listNoun: 'zodiac signs',
  },
] as const;

describe.each(VOCABULARIES)('$query', ({ query, type, table, column, field, listNoun }) => {
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

    it('refuses every non-admin, the coven owner A included, and a signed-out request, as FORBIDDEN, writing nothing', async () => {
      for (const session of [asUser(A), asUser(B), asUser(C), asUser(D), null]) {
        const result = await send(session, CREATE, { input: input() });
        expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      }
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
    it('rewrites one for a site admin, carrying a rename onto the compendium entry holding it', async () => {
      const id = await seed('Fixture Old');
      const held = await insertIngredient(
        sql,
        makeIngredient({ name: 'Testwort', nomenclature: 'none', [field]: ['Fixture Old'] }),
        E.id,
      );

      const result = await send<Record<string, AstrologyValueNode>>(asUser(E), UPDATE, {
        id,
        input: input('Fixture New'),
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.[`update${type}`]).toMatchObject({ id, slug: 'fixture-new' });
      const [entry] = await sql`select * from ingredients where id = ${held}`;
      expect(entry[column]).toEqual(['Fixture New']);
    });

    it('refuses every non-admin and a signed-out request by id, as FORBIDDEN, leaving it as it was', async () => {
      const id = await seed('Fixture Kept');
      const before = await rowOf(id);

      for (const session of [asUser(A), asUser(B), asUser(C), asUser(D), null]) {
        const result = await send(session, UPDATE, { id, input: input('Fixture Taken Over') });
        expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      }
      expect(await rowOf(id)).toEqual(before);
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

    it('refuses every non-admin and a signed-out request by id, as FORBIDDEN, the row left live', async () => {
      const id = await seed('Fixture Kept');

      for (const session of [asUser(A), asUser(B), asUser(C), asUser(D), null]) {
        const result = await send(session, DELETE, { id });
        expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      }
      expect((await rowOf(id)).deleted_at).toBeNull();
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

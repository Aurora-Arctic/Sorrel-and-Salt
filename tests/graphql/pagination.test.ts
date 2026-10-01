import { GraphQLError, graphql, type GraphQLObjectType, type GraphQLSchema } from 'graphql';
import { complexityFromQuery } from '@pothos/plugin-complexity';
import { describe, expect, it } from 'vitest';
import { MAX_COST, createBuilder } from '@/graphql/builder';
import { createLoaders } from '@/graphql/loaders';
import { noSender } from '../support/email-verification';
import type { Cursor, PageCount, PageEntry, PageRequest } from '@/lib/types';
import type { Context } from '@/graphql/types';
import type { Leaf, LeavesData, CountedData } from './types';

// The transport half of CLAUDE.md rule 8, over a throwaway schema: a list of
// 250 branches, each with a connection of 250 leaves, so no page size is
// bounded by running out of rows.

const LEAVES: Leaf[] = Array.from({ length: 250 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  name: `Leaf ${String(index).padStart(3, '0')}`,
}));

/** A keyset finder over the array, answering a `PageRequest` as the repository does. */
function fakeFindPage(page: PageRequest, requests: PageRequest[] = []): PageEntry<Leaf>[] {
  requests.push(page);
  const position = (leaf: Leaf) => `${leaf.name}\u0000${leaf.id}`;
  const bound = (cursor: { key: readonly string[]; id: string }) =>
    `${cursor.key[0]}\u0000${cursor.id}`;
  const rows = LEAVES.filter(
    (leaf) =>
      (!page.after || position(leaf) > bound(page.after)) &&
      (!page.before || position(leaf) < bound(page.before)),
  );
  if (page.inverted) rows.reverse();
  return rows
    .slice(0, page.limit)
    .map((leaf) => ({ cursor: { key: [leaf.name], id: leaf.id }, node: leaf }));
}

function leafSchema(requests: PageRequest[] = []): GraphQLSchema {
  const scratch = createBuilder();
  const LeafRef = scratch.objectRef<Leaf>('Leaf');
  LeafRef.implement({ fields: (t) => ({ name: t.exposeString('name') }) });
  const BranchRef = scratch.objectRef<Leaf>('Branch');
  BranchRef.implement({
    fields: (t) => ({
      name: t.exposeString('name'),
      children: t.pagedConnection({
        type: LeafRef,
        resolve: (_parent, _args, page) => Promise.resolve(fakeFindPage(page)),
      }),
    }),
  });
  scratch.queryType({
    fields: (t) => ({
      leaves: t.pagedConnection({
        type: BranchRef,
        args: { prefix: t.arg.string({ required: false }) },
        resolve: (_parent, { prefix }, page) =>
          Promise.resolve(
            fakeFindPage(page, requests).filter((entry) =>
              entry.node.name.startsWith(prefix ?? ''),
            ),
          ),
      }),
    }),
  });
  return scratch.toSchema();
}

const context: Context = {
  session: null,
  loaders: createLoaders(null),
  emailVerification: noSender,
};

async function run(
  schema: GraphQLSchema,
  source: string,
  variableValues?: Record<string, unknown>,
) {
  return graphql({ schema, source, variableValues, contextValue: { ...context } });
}

const PAGE = 'edges { cursor node { name } } pageInfo { hasNextPage endCursor }';

describe('a paged connection', () => {
  it('gives 25 rows when the client names no size', async () => {
    const result = await run(leafSchema(), `{ leaves { ${PAGE} } }`);

    expect(result.errors).toBeUndefined();
    expect((result.data as LeavesData).leaves.edges).toHaveLength(25);
  });

  // Silently and consistently: the literal and the variable get the same answer.
  it('gives 100 rows, and no error, to a literal asking for 1000', async () => {
    const result = await run(leafSchema(), `{ leaves(first: 1000) { ${PAGE} } }`);

    expect(result.errors).toBeUndefined();
    expect((result.data as LeavesData).leaves.edges).toHaveLength(100);
    expect((result.data as LeavesData).leaves.pageInfo.hasNextPage).toBe(true);
  });

  it('gives 100 rows, and no error, to a variable asking for 1000', async () => {
    const result = await run(leafSchema(), `query ($n: Int) { leaves(first: $n) { ${PAGE} } }`, {
      n: 1000,
    });

    expect(result.errors).toBeUndefined();
    expect((result.data as LeavesData).leaves.edges).toHaveLength(100);
  });

  it('continues from endCursor, and the resolver sees a decoded position, not the string', async () => {
    const requests: PageRequest[] = [];
    const schema = leafSchema(requests);
    const first = await run(schema, `{ leaves(first: 3) { ${PAGE} } }`);
    const after = (first.data as LeavesData).leaves.pageInfo.endCursor;

    const next = await run(
      schema,
      `query ($after: String) { leaves(first: 3, after: $after) { ${PAGE} } }`,
      {
        after,
      },
    );

    expect((next.data as LeavesData).leaves.edges.map((edge) => edge.node.name)).toEqual([
      'Leaf 003',
      'Leaf 004',
      'Leaf 005',
    ]);
    expect(requests[1]).toEqual({
      after: { key: ['Leaf 002'], id: LEAVES[2].id },
      limit: 4,
      inverted: false,
    });
  });

  it('passes the field’s own arguments through to the resolver', async () => {
    const result = await run(leafSchema(), `{ leaves(first: 100, prefix: "Leaf 01") { ${PAGE} } }`);

    expect((result.data as LeavesData).leaves.edges.map((edge) => edge.node.name)).toEqual(
      Array.from({ length: 10 }, (_, index) => `Leaf 01${index}`),
    );
  });

  it('refuses a malformed cursor as bad input, without fetching', async () => {
    const requests: PageRequest[] = [];
    const result = await run(
      leafSchema(requests),
      `{ leaves(after: "OffsetConnection:25") { ${PAGE} } }`,
    );

    expect(result.data).toBeNull();
    expect(result.errors?.map((error) => error.message)).toEqual(['Invalid cursor']);
    expect(requests).toEqual([]);
  });

  it('leaves any other error as the resolver threw it', async () => {
    const scratch = createBuilder();
    const LeafRef = scratch.objectRef<Leaf>('Leaf');
    LeafRef.implement({ fields: (t) => ({ name: t.exposeString('name') }) });
    scratch.queryType({
      fields: (t) => ({
        leaves: t.pagedConnection({
          type: LeafRef,
          resolve: () => Promise.reject(new Error('the finder failed')),
        }),
      }),
    });

    const result = await run(scratch.toSchema(), `{ leaves { ${PAGE} } }`);

    expect(result.errors?.map((error) => error.message)).toEqual(['the finder failed']);
    expect(result.errors?.[0].originalError).not.toBeInstanceOf(GraphQLError);
  });

  it('exposes what an entry carries as the edge fields it declares', async () => {
    const scratch = createBuilder();
    const LeafRef = scratch.objectRef<Leaf>('Leaf');
    LeafRef.implement({ fields: (t) => ({ name: t.exposeString('name') }) });
    scratch.queryType({
      fields: (t) => ({
        leaves: t.pagedConnection({
          type: LeafRef,
          resolve: (_parent, _args, page) =>
            Promise.resolve(
              fakeFindPage(page).map((entry, index) => ({
                ...entry,
                rank: index % 2 === 0 ? index : null,
              })),
            ),
          edgeFields: (edge) => ({
            rank: edge.int({ nullable: true, resolve: (entry) => entry.rank }),
          }),
        }),
      }),
    });

    const result = await run(
      scratch.toSchema(),
      '{ leaves(first: 3) { edges { rank node { name } } } }',
    );

    expect(result.errors).toBeUndefined();
    expect((result.data as { leaves: { edges: { rank: number | null }[] } }).leaves.edges).toEqual([
      { rank: 0, node: { name: 'Leaf 000' } },
      { rank: null, node: { name: 'Leaf 001' } },
      { rank: 2, node: { name: 'Leaf 002' } },
    ]);
  });

  it('refuses a negative size', async () => {
    const result = await run(leafSchema(), `{ leaves(first: -1) { ${PAGE} } }`);

    expect(result.errors?.map((error) => error.message)).toEqual([
      'Argument "first" must be a non-negative integer',
    ]);
  });

  it('shapes the connection as Relay does, non-null throughout', () => {
    const connection = leafSchema().getQueryType()?.getFields().leaves;

    expect(String(connection?.type)).toBe('QueryLeavesConnection!');
    expect(connection?.args.map((arg) => arg.name).sort()).toEqual(
      ['after', 'before', 'first', 'last', 'prefix'].sort(),
    );
  });
});

/**
 * A connection given a `count`, which records each start it is asked from and
 * answers as a counting finder would: the whole array, and the rows before
 * the start — null with none.
 */
function countedSchema(starts: (Cursor | undefined)[] = []): GraphQLSchema {
  const scratch = createBuilder();
  const LeafRef = scratch.objectRef<Leaf>('Leaf');
  LeafRef.implement({ fields: (t) => ({ name: t.exposeString('name') }) });
  scratch.queryType({
    fields: (t) => ({
      leaves: t.pagedConnection({
        type: LeafRef,
        resolve: (_parent, _args, page) => Promise.resolve(fakeFindPage(page)),
        count: (_parent, _args, start): Promise<PageCount> => {
          starts.push(start);
          return Promise.resolve({
            totalCount: LEAVES.length,
            countBefore: start ? LEAVES.findIndex((leaf) => leaf.id === start.id) : null,
          });
        },
      }),
    }),
  });
  return scratch.toSchema();
}

describe('a paged connection given a count', () => {
  it('declares totalCount and countBefore, and only then', () => {
    const counted = countedSchema().getType('QueryLeavesConnection') as GraphQLObjectType;
    const plain = leafSchema().getType('QueryLeavesConnection') as GraphQLObjectType;

    expect(String(counted.getFields().totalCount?.type)).toBe('Int!');
    expect(String(counted.getFields().countBefore?.type)).toBe('Int');
    expect(Object.keys(plain.getFields()).sort()).toEqual(['edges', 'pageInfo']);
  });

  it('counts nothing when neither field is selected', async () => {
    const starts: (Cursor | undefined)[] = [];

    const result = await run(countedSchema(starts), `{ leaves(first: 3) { ${PAGE} } }`);

    expect(result.errors).toBeUndefined();
    expect((result.data as CountedData).leaves.edges).toHaveLength(3);
    expect(starts).toEqual([]);
  });

  it('counts once for both fields, from the page’s first row', async () => {
    const starts: (Cursor | undefined)[] = [];
    const schema = countedSchema(starts);
    const first = await run(schema, `{ leaves(first: 3) { ${PAGE} } }`);
    const after = (first.data as CountedData).leaves.pageInfo.endCursor;

    const next = await run(
      schema,
      'query ($after: String) { leaves(first: 3, after: $after) { totalCount countBefore edges { node { name } } } }',
      { after },
    );

    expect(next.errors).toBeUndefined();
    expect((next.data as CountedData).leaves).toMatchObject({ totalCount: 250, countBefore: 3 });
    expect(starts).toEqual([{ key: ['Leaf 003'], id: LEAVES[3].id }]);
  });

  it('counts from no start on an empty page, whose countBefore is null', async () => {
    const starts: (Cursor | undefined)[] = [];
    const schema = countedSchema(starts);
    const last = await run(schema, `{ leaves(last: 1) { ${PAGE} } }`);
    const after = (last.data as CountedData).leaves.pageInfo.endCursor;

    const past = await run(
      schema,
      'query ($after: String) { leaves(after: $after) { totalCount countBefore edges { node { name } } } }',
      { after },
    );

    expect(past.errors).toBeUndefined();
    expect((past.data as CountedData).leaves).toEqual({
      totalCount: 250,
      countBefore: null,
      edges: [],
    });
    expect(starts).toEqual([undefined]);
  });
});

/** Two pages, one inside the other, with the size written `size`. */
function nested(size: string): string {
  return `{ leaves${size} { edges { node { children${size} { edges { node { name } } } } } } }`;
}

function cost(source: string, variables?: Record<string, unknown>): number {
  return complexityFromQuery(source, { schema: leafSchema(), ctx: { ...context }, variables })
    .complexity;
}

describe('the complexity limit prices a connection at the page it will fetch', () => {
  it('prices a literal, a variable and a clamped request alike', () => {
    const literal = cost(nested('(first: 100)'));

    expect(cost('query ($n: Int) ' + nested('(first: $n)'), { n: 100 })).toBe(literal);
    expect(cost(nested('(first: 1000)'))).toBe(literal);
    expect(cost('query ($n: Int) ' + nested('(first: $n)'), { n: 1000 })).toBe(literal);
  });

  it('prices an unsized connection at the default page of 25', () => {
    expect(cost(nested(''))).toBe(cost(nested('(first: 25)')));
    expect(cost(nested(''))).toBeLessThan(cost(nested('(first: 26)')));
  });

  // The shape is the same either side; only the page size moves the price.
  it('answers two nested default pages, and two nested pages of 10', async () => {
    for (const source of [nested(''), nested('(first: 10)')]) {
      expect(cost(source)).toBeLessThanOrEqual(MAX_COST);
      expect((await run(leafSchema(), source)).errors).toBeUndefined();
    }
  });

  it('refuses two nested pages of 100, however the size is written', async () => {
    const refusal = [expect.stringMatching(/^Query exceeds maximum complexity/)];

    const literal = await run(leafSchema(), nested('(first: 100)'));
    const variable = await run(leafSchema(), 'query ($n: Int) ' + nested('(first: $n)'), {
      n: 100,
    });
    const clamped = await run(leafSchema(), 'query ($n: Int) ' + nested('(first: $n)'), {
      n: 1000,
    });

    for (const result of [literal, variable, clamped]) {
      expect(result.data).toBeNull();
      expect(result.errors?.map((error) => error.message)).toEqual(refusal);
    }
  });

  // One field under the connection each, so a count costs what a `pageInfo`
  // field does at every size: the page it sits beside, not the list it counts.
  it('prices the two count fields as it prices pageInfo, at the page size', () => {
    const counted = (source: string) =>
      complexityFromQuery(source, { schema: countedSchema(), ctx: { ...context } }).complexity;

    for (const size of ['', '(first: 10)', '(first: 100)', '(last: 1000)']) {
      expect(counted(`{ leaves${size} { totalCount countBefore } }`)).toBe(
        counted(`{ leaves${size} { pageInfo { hasNextPage } } }`),
      );
    }
    expect(counted('{ leaves(first: 100) { totalCount } }')).toBeGreaterThan(
      counted('{ leaves(first: 10) { totalCount } }'),
    );
  });

  it('refuses before any resolver runs', async () => {
    const requests: PageRequest[] = [];

    await run(leafSchema(requests), nested('(first: 100)'));

    expect(requests).toEqual([]);
  });
});

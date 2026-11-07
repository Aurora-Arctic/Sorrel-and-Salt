import { describe, expect, it, vi, afterAll, beforeAll } from 'vitest';
import { WARM_IMPORT_TIMEOUT } from '../../../support/warm-import';

const ENDPOINT = 'http://localhost/api/graphql';

vi.mock('@/lib/request-session', () => ({
  sessionStateFromHeaders: async () => ({
    session: null,
    emailVerified: false,
    termsAgreed: false,
    sessionFresh: false,
  }),
}));

// The mocked schema nests without end, so only the limits can refuse a query.
vi.mock('@/graphql/schema', async () => {
  const { createBuilder } = await import('@/graphql/builder');
  const scratch = createBuilder();
  const id = '00000000-0000-4000-8000-000000000000';
  const page = (limit: number) =>
    Promise.resolve(
      Array.from({ length: limit }, () => ({ cursor: { key: ['k'], id }, node: {} })),
    );
  const Leaf = scratch.objectRef<object>('Leaf');
  Leaf.implement({ fields: (t) => ({ name: t.string({ resolve: () => 'leaf' }) }) });
  const Node = scratch.objectRef<object>('Node');
  Node.implement({
    fields: (t) => ({
      name: t.string({ resolve: () => 'node' }),
      child: t.field({ type: Node, resolve: () => ({}) }),
      children: t.pagedConnection({ type: Leaf, resolve: (_p, _a, { limit }) => page(limit) }),
    }),
  });
  scratch.queryType({
    fields: (t) => ({
      node: t.field({ type: Node, resolve: () => ({}) }),
      nodes: t.pagedConnection({ type: Node, resolve: (_p, _a, { limit }) => page(limit) }),
    }),
  });
  return { schema: scratch.toSchema() };
});

let POST: (typeof import('@/app/api/graphql/route'))['POST'];

beforeAll(async () => {
  vi.stubEnv('NODE_ENV', 'production');
  ({ POST } = await import('@/app/api/graphql/route'));
}, WARM_IMPORT_TIMEOUT);

afterAll(() => {
  vi.unstubAllEnvs();
});

async function query(source: string, variables?: Record<string, unknown>) {
  const response = await POST(
    new Request(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-sorrel-client': 'web' },
      body: JSON.stringify({ query: source, variables }),
    }),
  );
  return (await response.json()) as { data?: unknown; errors?: { message: string }[] };
}

function nested(depth: number): string {
  let selection = 'name';
  for (let level = 2; level < depth; level += 1) selection = `child { ${selection} }`;
  return `{ node { ${selection} } }`;
}

/** Two pages, one inside the other: `size` squared rows at depth 7. `size` is written as given, so `(first: 10)` and `(first: $n)` are the same shape. */
function paged(size: string): string {
  return `{ nodes${size} { edges { node { children${size} { edges { node { name } } } } } } }`;
}

describe('graphql-armor', () => {
  describe('depth', () => {
    // The precondition: the schema answers seven levels, so a refusal one
    // level further is the limit and not a schema that stops short.
    it('answers a query seven levels deep', async () => {
      const result = await query(nested(7));

      expect(result.errors).toBeUndefined();
      expect(JSON.stringify(result.data)).toContain('"name":"node"');
    });

    it('refuses a query nested past seven', async () => {
      const result = await query(nested(8));

      expect(result.data).toBeUndefined();
      expect(result.errors?.map((e) => e.message)).toEqual([
        'Syntax Error: Query depth limit of 7 exceeded, found 8.',
      ]);
    });
  });

  // Priced by the complexity plugin at the page each connection will fetch
  // (claude-docs/graphql/protections.md, "Protections"), so a refusal is an execution
  // error: `data` is null rather than absent.
  describe('cost', () => {
    const refusal = [
      expect.stringMatching(/^Query exceeds maximum complexity \(complexity: \d+, max: 5000\)$/),
    ];

    it('answers a composed query within the limit', async () => {
      const result = await query(paged('(first: 10)'));

      expect(result.errors).toBeUndefined();
    });

    it('refuses an expensive composed query', async () => {
      const result = await query(paged('(first: 100)'));

      expect(result.data).toBeNull();
      expect(result.errors?.map((e) => e.message)).toEqual(refusal);
    });

    // graphql-armor's cost check priced `first: $n` at one row, whatever $n held.
    it('refuses it when the page size is a variable', async () => {
      const result = await query(`query ($n: Int) ${paged('(first: $n)')}`, { n: 100 });

      expect(result.data).toBeNull();
      expect(result.errors?.map((e) => e.message)).toEqual(refusal);
    });

    // And refused a literal past the maximum that the server clamps and answers.
    it('answers a single page asking for more than the maximum', async () => {
      const result = await query('{ nodes(first: 1000) { edges { node { name } } } }');

      expect(result.errors).toBeUndefined();
      expect((result.data as { nodes: { edges: unknown[] } }).nodes.edges).toHaveLength(100);
    });
  });
});

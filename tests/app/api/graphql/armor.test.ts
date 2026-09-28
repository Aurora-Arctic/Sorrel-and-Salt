import { describe, expect, it, vi, afterEach } from 'vitest';

const ENDPOINT = 'http://localhost/api/graphql';

vi.mock('@/lib/request-session', () => ({ sessionFromHeaders: async () => null }));

// The real schema is one `ok` field, one level deep, so no query against it
// can reach a depth or cost limit. The route is loaded over a schema that
// nests without end and pages without running out of rows, so the limits are
// the only thing that can refuse a query here.
vi.mock('@/graphql/schema', async () => {
  const { createBuilder } = await import('@/graphql/builder');
  const scratch = createBuilder();
  const id = '00000000-0000-4000-8000-000000000000';
  const page = (limit: number) =>
    Promise.resolve(Array.from({ length: limit }, () => ({ cursor: { key: 'k', id }, node: {} })));
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

async function loadRoute(nodeEnv: string) {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', nodeEnv);
  return import('@/app/api/graphql/route');
}

async function query(nodeEnv: string, source: string, variables?: Record<string, unknown>) {
  const { POST } = await loadRoute(nodeEnv);
  const response = await POST(
    new Request(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: source, variables }),
    }),
  );
  return (await response.json()) as { data?: unknown; errors?: { message: string }[] };
}

/** `node { child { … { name } } }`, `depth` field levels deep, `name` included. */
function nested(depth: number): string {
  let selection = 'name';
  for (let level = 2; level < depth; level += 1) selection = `child { ${selection} }`;
  return `{ node { ${selection} } }`;
}

/**
 * Two pages, one inside the other: `size` squared rows, at depth 7. `size` is
 * written as given, so `(first: 10)` and `(first: $n)` are the same shape.
 */
function paged(size: string): string {
  return `{ nodes${size} { edges { node { children${size} { edges { node { name } } } } } } }`;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

// Staging and every preview run at NODE_ENV=production, local development
// without it: the limits hold in both.
describe.each(['development', 'production'])('graphql-armor at NODE_ENV=%s', (nodeEnv) => {
  describe('depth', () => {
    // The precondition: the schema answers seven levels, so a refusal one
    // level further is the limit and not a schema that stops short.
    it('answers a query seven levels deep', async () => {
      const result = await query(nodeEnv, nested(7));

      expect(result.errors).toBeUndefined();
      expect(JSON.stringify(result.data)).toContain('"name":"node"');
    });

    it('refuses a query nested past seven', async () => {
      const result = await query(nodeEnv, nested(8));

      expect(result.data).toBeUndefined();
      expect(result.errors?.map((e) => e.message)).toEqual([
        'Syntax Error: Query depth limit of 7 exceeded, found 8.',
      ]);
    });
  });

  // Priced by the complexity plugin at the page each connection will fetch
  // (claude-docs/graphql.md, "Protections"), so a refusal is an execution
  // error: `data` is null rather than absent.
  describe('cost', () => {
    const refusal = [
      expect.stringMatching(/^Query exceeds maximum complexity \(complexity: \d+, max: 5000\)$/),
    ];

    // The same shape, cheaper: a refusal below is the price, not the shape.
    it('answers a composed query within the limit', async () => {
      const result = await query(nodeEnv, paged('(first: 10)'));

      expect(result.errors).toBeUndefined();
    });

    // Seven levels and no aliases, so neither the depth nor the alias limit
    // is what refuses it.
    it('refuses an expensive composed query', async () => {
      const result = await query(nodeEnv, paged('(first: 100)'));

      expect(result.data).toBeNull();
      expect(result.errors?.map((e) => e.message)).toEqual(refusal);
    });

    // graphql-armor's cost check priced `first: $n` at one row, whatever $n held.
    it('refuses it when the page size is a variable', async () => {
      const result = await query(nodeEnv, `query ($n: Int) ${paged('(first: $n)')}`, { n: 100 });

      expect(result.data).toBeNull();
      expect(result.errors?.map((e) => e.message)).toEqual(refusal);
    });

    // And refused a literal past the maximum that the server clamps and answers.
    it('answers a single page asking for more than the maximum', async () => {
      const result = await query(nodeEnv, '{ nodes(first: 1000) { edges { node { name } } } }');

      expect(result.errors).toBeUndefined();
      expect((result.data as { nodes: { edges: unknown[] } }).nodes.edges).toHaveLength(100);
    });
  });
});

import { describe, expect, it, vi, afterEach } from 'vitest';

const ENDPOINT = 'http://localhost/api/graphql';

vi.mock('@/lib/request-session', () => ({ sessionFromHeaders: async () => null }));

// The real schema is one `ok` field, one level deep, so no query against it
// can reach a depth or cost limit. The route is loaded over a schema that
// nests without end and pages with `first`, so the limits are the only thing
// that can refuse a query here.
vi.mock('@/graphql/schema', async () => {
  const { createBuilder } = await import('@/graphql/builder');
  const scratch = createBuilder();
  const Node = scratch.objectRef<object>('Node');
  Node.implement({
    fields: (t) => ({
      name: t.string({ resolve: () => 'node' }),
      child: t.field({ type: Node, resolve: () => ({}) }),
      children: t.field({
        type: [Node],
        args: { first: t.arg.int() },
        resolve: (_, { first }) => Array.from({ length: first ?? 1 }, () => ({})),
      }),
    }),
  });
  scratch.queryType({ fields: (t) => ({ node: t.field({ type: Node, resolve: () => ({}) }) }) });
  return { schema: scratch.toSchema() };
});

async function loadRoute(nodeEnv: string) {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', nodeEnv);
  return import('@/app/api/graphql/route');
}

async function query(nodeEnv: string, source: string) {
  const { POST } = await loadRoute(nodeEnv);
  const response = await POST(
    new Request(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: source }),
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

/** Two pages of `first`, one inside the other: `first` squared nodes. */
function paged(first: number): string {
  return `{ node { children(first: ${first}) { children(first: ${first}) { name } } } }`;
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

  describe('cost', () => {
    // The same shape, cheaper: a refusal below is the price, not the shape.
    it('answers a composed query within the limit', async () => {
      const result = await query(nodeEnv, paged(10));

      expect(result.errors).toBeUndefined();
    });

    // Four levels and no aliases, so neither the depth nor the alias limit
    // is what refuses it.
    it('refuses an expensive composed query', async () => {
      const result = await query(nodeEnv, paged(100));

      expect(result.data).toBeUndefined();
      expect(result.errors?.map((e) => e.message)).toEqual([
        expect.stringMatching(/^Syntax Error: Query Cost limit of 5000 exceeded, found \d+/),
      ]);
    });
  });
});

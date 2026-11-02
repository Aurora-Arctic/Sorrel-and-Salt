import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const ENDPOINT = 'https://sorrelandsalt.com/api/graphql';
const written = vi.hoisted(() => ({ count: 0 }));

vi.mock('@/lib/request-session', () => ({ sessionFromHeaders: async () => null }));

// A schema with one mutation that counts its calls, so "no resolver ran" is a state the test reads.
vi.mock('@/graphql/schema', async () => {
  const { createBuilder } = await import('@/graphql/builder');
  const scratch = createBuilder();
  scratch.queryType({ fields: (t) => ({ ok: t.boolean({ resolve: () => true }) }) });
  scratch.mutationType({
    fields: (t) => ({
      write: t.boolean({
        resolve: () => {
          written.count += 1;
          return true;
        },
      }),
    }),
  });
  return { schema: scratch.toSchema() };
});

let POST: (typeof import('@/app/api/graphql/route'))['POST'];
let GET: (typeof import('@/app/api/graphql/route'))['GET'];

beforeAll(async () => {
  vi.stubEnv('NODE_ENV', 'production');
  ({ POST, GET } = await import('@/app/api/graphql/route'));
});
afterAll(() => vi.unstubAllEnvs());
beforeEach(() => {
  written.count = 0;
});

const MUTATION = 'mutation { write }';

function post(headers: Record<string, string>, body: string = JSON.stringify({ query: MUTATION })) {
  return POST(
    new Request(ENDPOINT, {
      method: 'POST',
      headers: { host: 'sorrelandsalt.com', ...headers },
      body,
    }),
  );
}

describe('a mutation is accepted only from this site', () => {
  it('runs when the site sends it: JSON with its own Origin', async () => {
    const response = await post({
      'content-type': 'application/json',
      origin: 'https://sorrelandsalt.com',
    });

    expect(response.status).toBe(200);
    expect(written.count).toBe(1);
  });

  it('runs when a script sends it: JSON with the site client header and no Origin', async () => {
    const response = await post({
      'content-type': 'application/json',
      'x-sorrel-client': 'web',
    });

    expect(response.status).toBe(200);
    expect(written.count).toBe(1);
  });

  it('is refused as a form, which a page on another site can send without a preflight', async () => {
    const response = await post(
      { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://sorrelandsalt.com' },
      new URLSearchParams({ query: MUTATION }).toString(),
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(written.count).toBe(0);
  });

  it.each([
    ['no Origin and no client header', {}],
    ['an Origin from another site', { origin: 'https://evil.example' }],
    ['an Origin of null', { origin: 'null' }],
    ['an Origin on another port', { origin: 'https://sorrelandsalt.com:8443' }],
  ])('is refused with %s', async (_name, extra) => {
    const response = await post({ 'content-type': 'application/json', ...extra });

    expect(response.status).toBe(403);
    expect(written.count).toBe(0);
  });

  it('still answers a read sent as GET, which cannot change anything', async () => {
    const response = await GET(
      new Request(`${ENDPOINT}?query=${encodeURIComponent('{ ok }')}`, {
        headers: { host: 'sorrelandsalt.com', accept: 'application/json' },
      }),
    );

    expect(response.status).toBe(200);
  });

  it('refuses a mutation sent as GET, as before', async () => {
    const response = await GET(
      new Request(`${ENDPOINT}?query=${encodeURIComponent(MUTATION)}`, {
        headers: { host: 'sorrelandsalt.com', accept: 'application/json' },
      }),
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(written.count).toBe(0);
  });
});

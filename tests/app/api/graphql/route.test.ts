import { afterEach, describe, expect, it, vi } from 'vitest';

const ENDPOINT = 'http://localhost/api/graphql';

// The route builds its Yoga instance at import, reading NODE_ENV once, so each
// environment gets a fresh module.
async function loadRoute(nodeEnv: string) {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', nodeEnv);
  return import('@/app/api/graphql/route');
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

// What a browser sends when it navigates to the endpoint.
function browserGet() {
  return new Request(ENDPOINT, { headers: { accept: 'text/html' } });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('/api/graphql', () => {
  it('answers a trivial query in-process', async () => {
    const { POST } = await loadRoute('test');
    const response = await POST(post({ query: '{ ok }' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { ok: true } });
  });

  it('answers a query sent as GET', async () => {
    const { GET } = await loadRoute('test');
    const response = await GET(
      new Request(`${ENDPOINT}?query=${encodeURIComponent('{ ok }')}`, {
        headers: { accept: 'application/json' },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { ok: true } });
  });

  it('serves GraphiQL to a browser in local development', async () => {
    const { GET } = await loadRoute('development');
    const response = await GET(browserGet());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/html/);
    await expect(response.text()).resolves.toMatch(/graphiql/i);
  });

  // Every deploy, staging and hotfix previews included, runs at
  // NODE_ENV=production, so this is the staging case.
  it('serves no GraphiQL in production', async () => {
    const { GET } = await loadRoute('production');
    const response = await GET(browserGet());

    expect(response.headers.get('content-type') ?? '').not.toMatch(/^text\/html/);
    await expect(response.text()).resolves.not.toMatch(/graphiql/i);
  });

  // Yoga's default reflects any Origin and allows credentials. The client is
  // same-origin, so another origin, a sibling preview subdomain included,
  // gets no CORS grant to read a response made with the visitor's cookie.
  it('grants no cross-origin access', async () => {
    const { POST } = await loadRoute('production');
    const response = await POST(
      post({ query: '{ ok }' }, { origin: 'https://hotfix-example.sorrelandsalt.com' }),
    );

    // The request itself succeeded, so the missing headers are the policy and
    // not a refusal that happens to carry none.
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(response.headers.get('access-control-allow-credentials')).toBeNull();
  });
});

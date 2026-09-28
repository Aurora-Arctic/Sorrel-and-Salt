import { afterEach, describe, expect, it, vi } from 'vitest';
import altairPackage from 'altair-static/package.json';

const ENDPOINT = 'http://localhost/api/graphql';

// Signed out throughout: the context's session is context.test.ts's subject,
// and the real reader loads Better Auth, which refuses to start at
// NODE_ENV=production without its secrets.
vi.mock('@/lib/request-session', () => ({ sessionFromHeaders: async () => null }));

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

  // curl and scripts send no Accept at all; only a navigation gets the page.
  it('answers a GET query that names no Accept, even where the IDE is on', async () => {
    const { GET } = await loadRoute('development');
    const response = await GET(new Request(`${ENDPOINT}?query=${encodeURIComponent('{ ok }')}`));

    expect(response.headers.get('content-type')).toMatch(/json/);
    await expect(response.json()).resolves.toEqual({ data: { ok: true } });
  });

  it('serves Altair to a browser in local development', async () => {
    const { GET } = await loadRoute('development');
    const response = await GET(browserGet());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/html/);
    const html = await response.text();
    expect(html).toContain('AltairGraphQL.init(');
    // The shell and its assets come from one version: the CDN base is pinned
    // to the package that rendered the page.
    expect(html).toContain(
      `<base href="https://cdn.jsdelivr.net/npm/altair-static@${altairPackage.version}/build/dist/">`,
    );
    // Absolute, and the request's own origin: <base> points at the CDN, so a
    // relative endpoint would resolve there, and the dev server answers on
    // more than one host.
    expect(html).toContain('http://localhost/api/graphql');
    expect(html).toContain('withCredentials');
  });

  // `next dev --hostname 0.0.0.0` puts its bind address in request.url; the
  // browser's cookie belongs to the host it typed, which is the Host header.
  it('points Altair at the host the browser used', async () => {
    const { GET } = await loadRoute('development');
    const response = await GET(
      new Request('http://0.0.0.0:8000/api/graphql', {
        headers: { accept: 'text/html', host: 'sorrel-app:8000' },
      }),
    );

    const html = await response.text();
    expect(html).toContain('http://sorrel-app:8000/api/graphql');
    expect(html).not.toContain('0.0.0.0');
  });

  // Every deploy, staging and hotfix previews included, runs at
  // NODE_ENV=production, so this is the staging case.
  it('serves no IDE in production', async () => {
    const { GET } = await loadRoute('production');
    const response = await GET(browserGet());

    expect(response.headers.get('content-type') ?? '').not.toMatch(/^text\/html/);
    await expect(response.text()).resolves.not.toMatch(/altair|graphiql/i);
  });

  // What the IDE runs for its docs pane and autocompletion.
  const introspection = '{ __schema { queryType { name } } }';

  it('answers introspection in local development', async () => {
    const { POST } = await loadRoute('development');
    const response = await POST(post({ query: introspection }));

    await expect(response.json()).resolves.toEqual({
      data: { __schema: { queryType: { name: 'Query' } } },
    });
  });

  it('refuses introspection in production', async () => {
    const { POST } = await loadRoute('production');
    const response = await POST(post({ query: introspection }));

    const result = await response.json();
    expect(result.data).toBeUndefined();
    // One error for each introspection field the query names.
    expect(result.errors.length).toBeGreaterThan(0);
    for (const error of result.errors) {
      expect(error.message).toMatch(/^GraphQL introspection has been disabled/);
    }
  });

  // `__type` names one type rather than the whole schema, and is refused too.
  it('refuses a single-type introspection in production', async () => {
    const { POST } = await loadRoute('production');
    const response = await POST(post({ query: '{ __type(name: "AuditInfo") { name } }' }));

    await expect(response.json()).resolves.not.toHaveProperty('data.__type');
  });

  // A misspelt field is how a client without introspection probes the schema:
  // graphql-js answers it with the field it probably meant.
  it('suggests the field a misspelling meant in local development', async () => {
    const { POST } = await loadRoute('development');
    const response = await POST(post({ query: '{ ko }' }));

    const result = await response.json();
    expect(result.errors[0].message).toContain('Did you mean "ok"?');
  });

  it('suggests no field in production', async () => {
    const { POST } = await loadRoute('production');
    const response = await POST(post({ query: '{ ko }' }));

    const result = await response.json();
    // Still refused, and still says why: only the suggestion is gone.
    expect(result.errors[0].message).toMatch(/^Cannot query field "ko" on type "Query"\./);
    expect(result.errors[0].message).not.toMatch(/"ok"|did you mean/i);
  });

  // The schema's first mutation is refused signed out by its scope, before its
  // service — and so before the context's sender could send anything.
  it('refuses setEmail signed out with FORBIDDEN and no data', async () => {
    const { POST } = await loadRoute('production');
    const response = await POST(
      post({ query: 'mutation { setEmail(email: "someone@route.test") { id } }' }),
    );

    const result = await response.json();
    expect(result.data).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].extensions).toEqual({ code: 'FORBIDDEN' });
  });

  // The mapping is claude-docs/graphql.md's "Errors"; tests/graphql/errors.test.ts
  // covers each type. This is the route carrying it: `me` signed out is refused
  // by its scope, which throws the same `Forbidden` a service does.
  it.each(['production', 'development'])('answers a refusal with its code in %s', async (env) => {
    const { POST } = await loadRoute(env);
    const response = await POST(post({ query: '{ me { id } }' }));

    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.data).toBeNull();
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: 'Forbidden',
        path: ['me'],
        extensions: { code: 'FORBIDDEN' },
      }),
    ]);
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

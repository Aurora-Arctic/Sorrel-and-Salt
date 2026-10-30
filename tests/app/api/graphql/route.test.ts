import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { warmImport } from '../../../support/warm-import';

warmImport(() => import('@/app/api/graphql/route'));

const ENDPOINT = 'http://localhost/api/graphql';

// Signed out throughout: the context's session is context.test.ts's subject,
// and the real reader loads Better Auth, which refuses to start at
// NODE_ENV=production without its secrets.
vi.mock('@/lib/request-session', () => ({ sessionFromHeaders: async () => null }));

type Route = typeof import('@/app/api/graphql/route');

// The route builds its Yoga instance at import, reading NODE_ENV once, so each
// environment gets a fresh module, loaded once for the cases that share it.
function routeIn(nodeEnv: string): () => Route {
  let route: Route;
  beforeAll(async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', nodeEnv);
    route = await import('@/app/api/graphql/route');
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });
  return () => route;
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('/api/graphql', () => {
  describe('under test', () => {
    const route = routeIn('test');

    it('answers a trivial query in-process', async () => {
      const response = await route().POST(post({ query: '{ ok }' }));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ data: { ok: true } });
    });

    it('answers a query sent as GET', async () => {
      const response = await route().GET(
        new Request(`${ENDPOINT}?query=${encodeURIComponent('{ ok }')}`, {
          headers: { accept: 'application/json' },
        }),
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ data: { ok: true } });
    });
  });

  // The IDE local development serves (Altair, introspection, field suggestions) is developer
  // tooling and is not tested. Production's half — no IDE, no introspection, no suggestion —
  // is tests/e2e/graphql.spec.ts's, against the production build every deploy runs.
  describe('in local development', () => {
    const route = routeIn('development');

    // curl and scripts send no Accept at all; only a navigation gets the IDE's page.
    it('answers a GET query that names no Accept, even where the IDE is on', async () => {
      const response = await route().GET(
        new Request(`${ENDPOINT}?query=${encodeURIComponent('{ ok }')}`),
      );

      expect(response.headers.get('content-type')).toMatch(/json/);
      await expect(response.json()).resolves.toEqual({ data: { ok: true } });
    });
  });

  describe('in production', () => {
    const route = routeIn('production');

    // `__type` names one type rather than the whole schema, and is refused too.
    it('refuses a single-type introspection', async () => {
      const response = await route().POST(
        post({ query: '{ __type(name: "AuditInfo") { name } }' }),
      );

      await expect(response.json()).resolves.not.toHaveProperty('data.__type');
    });

    // The mapping is claude-docs/graphql/errors.md's "Errors", and tests/graphql/errors.test.ts covers each type. This case is the route carrying it:
    // `me` signed out is refused by its scope, which throws the same `Forbidden` a service does. The environment changes only the plugin set and the IDE, never the mapping, so one is enough.
    it('answers a refusal with its code', async () => {
      const response = await route().POST(post({ query: '{ me { id } }' }));

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
      const response = await route().POST(
        post({ query: '{ ok }' }, { origin: 'https://hotfix-example.sorrelandsalt.com' }),
      );

      // The request itself succeeded, so the missing headers are the policy and
      // not a refusal that happens to carry none.
      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
      expect(response.headers.get('access-control-allow-credentials')).toBeNull();
    });
  });
});

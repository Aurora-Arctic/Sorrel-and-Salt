import { afterEach, describe, expect, it, vi } from 'vitest';

// The workshop sets WORKSHOP_API_PREFIX at build time, so each client has to
// read it when it loads: the stubs are in place before a fresh import.
describe('the API address prefix', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('leaves an address as it is when no prefix is set', async () => {
    vi.stubEnv('WORKSHOP_API_PREFIX', undefined);
    const { apiPath } = await import('@/lib/api-path');

    expect(apiPath('/api/graphql')).toBe('/api/graphql');
  });

  it('puts the prefix in front of an address', async () => {
    vi.stubEnv('WORKSHOP_API_PREFIX', '/workshop');
    const { apiPath } = await import('@/lib/api-path');

    expect(apiPath('/api/auth')).toBe('/workshop/api/auth');
  });

  it('sends a GraphQL request to the prefixed address', async () => {
    vi.stubEnv('WORKSHOP_API_PREFIX', '/workshop');
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ data: { ok: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { graphqlRequest } = await import('@/lib/graphql-client');
    const { parse } = await import('graphql');

    await (graphqlRequest as (document: unknown) => Promise<unknown>)(parse('query Ok { ok }'));

    expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe('/workshop/api/graphql');
  });

  it('sends an auth request to the prefixed address', async () => {
    vi.stubEnv('WORKSHOP_API_PREFIX', '/workshop');
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ url: 'https://accounts.google.com/o/oauth2/v2/auth' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { signIn } = await import('@/lib/auth-client');

    await signIn.social({ provider: 'google', callbackURL: '/' });

    expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe(
      '/workshop/api/auth/sign-in/social',
    );
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

// Better Auth's client captures `fetch` once, at `createAuthClient()` time
// (node_modules/better-auth/dist/client/config.mjs: `customFetchImpl: fetch`)
// rather than reading `globalThis.fetch` fresh per call — so the stub has to
// be in place, and the module re-imported, before that capture happens.
// `@better-fetch/fetch` resolves lazily in the general case, which is why
// this file stubs first rather than mocking the whole module, as the
// component test does.
describe('auth-client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('posts to /api/auth/sign-in/social with the requested provider', async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        // No `redirect: true`, so Better Auth's own redirect plugin never
        // assigns `window.location.href`, which jsdom cannot follow.
        new Response(JSON.stringify({ url: 'https://accounts.google.com/o/oauth2/v2/auth' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.resetModules();
    const { signIn } = await import('@/lib/auth-client');

    await signIn.social({
      provider: 'google',
      callbackURL: '/coven/hearth',
      errorCallbackURL: '/sign-in?next=%2Fcoven%2Fhearth',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/auth/sign-in/social');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      provider: 'google',
      callbackURL: '/coven/hearth',
      errorCallbackURL: '/sign-in?next=%2Fcoven%2Fhearth',
    });
  });

  it('exposes signIn.social as a callable off both the named export and the client instance', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    );
    vi.resetModules();
    const { authClient, signIn } = await import('@/lib/auth-client');

    expect(authClient.signIn.social).toBeInstanceOf(Function);
    expect(signIn.social).toBeInstanceOf(Function);
  });
});

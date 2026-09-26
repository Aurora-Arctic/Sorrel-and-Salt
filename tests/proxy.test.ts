import { NextRequest } from 'next/server';
import {
  getRedirectUrl,
  getRewrittenUrl,
  unstable_doesMiddlewareMatch,
} from 'next/experimental/testing/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/session';
import { RETURN_PATH_HEADER } from '@/lib/sign-in';

// The workshop gate asks Better Auth for the session; that lookup is mocked
// here, and request-session.test.ts covers what it does with the answer.
const sessionFromHeaders = vi.hoisted(() => vi.fn<(headers: Headers) => Promise<Session | null>>());
vi.mock('@/lib/request-session', () => ({ sessionFromHeaders }));

const { config, proxy } = await import('@/proxy');

// Route protection is deny-by-default: the proxy names what is public, so a
// route nobody thought about is protected rather than open. The proxy's check is
// optimistic — a cookie is present — and the page's requireSession() is the one
// that asks the database (claude-docs/auth.md, "Route protection").

const ORIGIN = 'http://localhost:8000';
const USER_ID = '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f';

beforeEach(() => {
  sessionFromHeaders.mockReset();
});
const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });

// Better Auth's own name for it; `__Secure-` in production, which it also reads.
const SESSION_COOKIE = 'better-auth.session_token';

function request(path: string, cookie?: string, headers: Record<string, string> = {}) {
  return new NextRequest(`${ORIGIN}${path}`, {
    headers: cookie ? { ...headers, cookie } : headers,
  });
}

/** The request headers `NextResponse.next({ request: { headers } })` forwards upstream. */
function forwarded(response: Response, name: string): string | null {
  return response.headers.get(`x-middleware-request-${name}`);
}

// The matcher only keeps the proxy off what is never a page. Which pages are
// public is PUBLIC_ROUTES, below.
describe('the proxy matcher', () => {
  it.each([
    '/',
    '/sign-in',
    '/invite/2b7c5e2f8a',
    '/compendium',
    '/coven/hearth/grimoire/new?from=draft',
    '/admin/compendium',
    '/apiary',
    '/workshop',
    '/workshop/assets/index-B4mi58lY.js',
  ])('runs on the page %s', (path) => {
    expect(matches(path)).toBe(true);
  });

  // Imported assets ship under /_next/static/media, which is why the backdrop's
  // images are imported rather than dropped into public/.
  // Nothing in public/ is exempt: a file placed there is a protected page to
  // the matcher — redirected to /sign-in, HTML where the browser asked for an
  // image — until the PR that adds it also adds its entry. Pinned so the
  // first favicon or robots.txt does not ship redirected.
  it.each(['/favicon.ico', '/robots.txt', '/images/anything.webp'])(
    'still runs on a public-file path with no entry, %s',
    (path) => {
      expect(matches(path)).toBe(true);
    },
  );

  it.each([
    '/api/auth/callback/google?code=x',
    '/api/graphql',
    '/_next/static/chunks/main.js',
    '/_next/static/media/salt-spoon.1a2b3c4d.webp',
    '/_next/image?url=%2Fx.png&w=64&q=75',
  ])('stays off %s', (path) => {
    expect(matches(path)).toBe(false);
  });
});

describe('public routes', () => {
  it.each([
    '/',
    '/?ref=invite-email',
    '/sign-in',
    '/sign-in?next=%2Fcoven%2Fhearth&error=access_denied',
    '/invite/2b7c5e2f8a',
  ])('lets a signed-out request to %s through', async (path) => {
    const response = await proxy(request(path));

    expect(getRedirectUrl(response)).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  // Deny-by-default holds for lookalikes: an entry names a whole path, or a
  // whole segment with `/*`, so a route that merely starts with one is protected.
  it.each(['/sign-in-help', '/sign-in/elsewhere', '/invites', '/invite', '/compendium'])(
    'redirects a signed-out request to the lookalike %s',
    async (path) => {
      expect((await proxy(request(path))).status).toBe(307);
    },
  );

  // A public page that asks for a sign-in part-way — accepting an invitation —
  // needs its own path back, the same as a protected one.
  it('forwards the return path on a public route too', async () => {
    const response = await proxy(request('/invite/2b7c5e2f8a'));
    expect(forwarded(response, RETURN_PATH_HEADER)).toBe('/invite/2b7c5e2f8a');
  });
});

describe('proxy', () => {
  it('redirects a request with no session cookie to /sign-in, carrying the return path', async () => {
    const response = await proxy(request('/coven/hearth/ingredients?tab=stock'));

    expect(response.status).toBe(307);
    expect(getRedirectUrl(response)).toBe(
      `${ORIGIN}/sign-in?next=${encodeURIComponent('/coven/hearth/ingredients?tab=stock')}`,
    );
  });

  it('does not reflect a protocol-relative pathname into the return path', async () => {
    const response = await proxy(request('//evil.example/x'));
    expect(getRedirectUrl(response)).toBe(`${ORIGIN}/sign-in?next=%2Fcoven`);
  });

  // An unrelated cookie is not a session: the check is for Better Auth's name.
  it('redirects when the only cookie is not a session cookie', async () => {
    expect((await proxy(request('/compendium', 'theme=dark'))).status).toBe(307);
  });

  it.each([SESSION_COOKIE, `__Secure-${SESSION_COOKIE}`])(
    'lets a request carrying %s through to the page',
    async (name) => {
      const response = await proxy(request('/compendium', `${name}=token.signature`));

      expect(getRedirectUrl(response)).toBeNull();
      expect(response.headers.get('x-middleware-next')).toBe('1');
    },
  );

  // The page's secure check redirects too, for a cookie the database rejects,
  // and a server component has no other way to learn its own URL.
  it('forwards the return path to the page for its own redirect', async () => {
    const response = await proxy(request('/compendium?q=salt', `${SESSION_COOKIE}=t.s`));
    expect(forwarded(response, RETURN_PATH_HEADER)).toBe('/compendium?q=salt');
  });

  it('overwrites a return path the client supplied itself', async () => {
    const response = await proxy(
      request('/compendium', `${SESSION_COOKIE}=t.s`, { [RETURN_PATH_HEADER]: '/admin' }),
    );
    expect(forwarded(response, RETURN_PATH_HEADER)).toBe('/compendium');
  });
});

// The staging workshop (claude-docs/workshop.md, "On staging"): the one path
// where the proxy asks the database, because the static files under
// public/workshop/ have no page of their own to call requireSession().
describe('the workshop', () => {
  const signedIn = (path: string) => request(path, `${SESSION_COOKIE}=t.s`);

  it('redirects a signed-out request to /sign-in without asking the database', async () => {
    const response = await proxy(request('/workshop?story=theme-toggle--default'));

    expect(getRedirectUrl(response)).toBe(
      `${ORIGIN}/sign-in?next=${encodeURIComponent('/workshop?story=theme-toggle--default')}`,
    );
    expect(sessionFromHeaders).not.toHaveBeenCalled();
  });

  // A cookie present but not live — expired, revoked, forged. The optimistic
  // check alone would have let it through to the files.
  it('redirects a cookie Better Auth does not recognise to /sign-in', async () => {
    sessionFromHeaders.mockResolvedValue(null);

    const response = await proxy(signedIn('/workshop'));

    expect(sessionFromHeaders).toHaveBeenCalledOnce();
    expect(getRedirectUrl(response)).toBe(`${ORIGIN}/sign-in?next=%2Fworkshop`);
  });

  // Could pass only by the gate not running: the cookie is real and the
  // session live, so what refuses is the role and nothing else.
  it.each(['/workshop', '/workshop/index.html', '/workshop/assets/index-B4mi58lY.js'])(
    'refuses a signed-in non-admin at %s',
    async (path) => {
      sessionFromHeaders.mockResolvedValue({ userId: USER_ID, role: 'user' });

      const response = await proxy(signedIn(path));

      expect(sessionFromHeaders.mock.calls[0]?.[0].get('cookie')).toBe(`${SESSION_COOKIE}=t.s`);
      expect(response.status).toBe(403);
      expect(getRedirectUrl(response)).toBeNull();
      expect(response.headers.get('x-middleware-next')).toBeNull();
      expect(getRewrittenUrl(response)).toBeNull();
    },
  );

  it.each(['/workshop/index.html', '/workshop/meta.json', '/workshop/assets/index-B4mi58lY.js'])(
    'lets an admin through to %s',
    async (path) => {
      sessionFromHeaders.mockResolvedValue({ userId: USER_ID, role: 'admin' });

      const response = await proxy(signedIn(path));

      expect(response.headers.get('x-middleware-next')).toBe('1');
      expect(forwarded(response, RETURN_PATH_HEADER)).toBe(path);
    },
  );

  // Ladle routes by query string on one page; Next serves no directory index.
  it('serves an admin the workshop page at the bare path, query kept', async () => {
    sessionFromHeaders.mockResolvedValue({ userId: USER_ID, role: 'admin' });

    const response = await proxy(signedIn('/workshop?story=theme-toggle--default'));

    expect(getRewrittenUrl(response)).toBe(
      `${ORIGIN}/workshop/index.html?story=theme-toggle--default`,
    );
  });

  // The workshop's own code runs on this origin with an admin's cookie; the
  // policy is what stops it reaching /api/graphql.
  it.each(['/workshop', '/workshop/assets/index-B4mi58lY.js'])(
    "forbids the workshop's pages any fetch, at %s",
    async (path) => {
      sessionFromHeaders.mockResolvedValue({ userId: USER_ID, role: 'admin' });

      const response = await proxy(signedIn(path));

      expect(response.headers.get('content-security-policy')).toBe("connect-src 'none'");
    },
  );

  // Every other page keeps the cookie-only check: no lookup per navigation.
  it.each(['/compendium', '/workshopping', '/workshops/x', '/coven/workshop'])(
    'does not ask the database for %s',
    async (path) => {
      const response = await proxy(signedIn(path));

      expect(sessionFromHeaders).not.toHaveBeenCalled();
      expect(response.headers.get('x-middleware-next')).toBe('1');
      expect(response.headers.get('content-security-policy')).toBeNull();
    },
  );
});

import { NextRequest } from 'next/server';
import { getRedirectUrl, unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { describe, expect, it } from 'vitest';
import { config, proxy } from '@/proxy';
import { RETURN_PATH_HEADER } from '@/lib/sign-in';

// Route protection is deny-by-default: the proxy names what is public, so a
// route nobody thought about is protected rather than open. The proxy's check is
// optimistic — a cookie is present — and the page's requireSession() is the one
// that asks the database (claude-docs/auth.md, "Route protection").

const ORIGIN = 'http://localhost:8000';
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
  ])('runs on the page %s', (path) => {
    expect(matches(path)).toBe(true);
  });

  it.each([
    '/api/auth/callback/google?code=x',
    '/api/graphql',
    '/_next/static/chunks/main.js',
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
  ])('lets a signed-out request to %s through', (path) => {
    const response = proxy(request(path));

    expect(getRedirectUrl(response)).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  // Deny-by-default holds for lookalikes: an entry names a whole path, or a
  // whole segment with `/*`, so a route that merely starts with one is protected.
  it.each(['/sign-in-help', '/sign-in/elsewhere', '/invites', '/invite', '/compendium'])(
    'redirects a signed-out request to the lookalike %s',
    (path) => {
      expect(proxy(request(path)).status).toBe(307);
    },
  );

  // A public page that asks for a sign-in part-way — accepting an invitation —
  // needs its own path back, the same as a protected one.
  it('forwards the return path on a public route too', () => {
    const response = proxy(request('/invite/2b7c5e2f8a'));
    expect(forwarded(response, RETURN_PATH_HEADER)).toBe('/invite/2b7c5e2f8a');
  });
});

describe('proxy', () => {
  it('redirects a request with no session cookie to /sign-in, carrying the return path', () => {
    const response = proxy(request('/coven/hearth/ingredients?tab=stock'));

    expect(response.status).toBe(307);
    expect(getRedirectUrl(response)).toBe(
      `${ORIGIN}/sign-in?next=${encodeURIComponent('/coven/hearth/ingredients?tab=stock')}`,
    );
  });

  it('does not reflect a protocol-relative pathname into the return path', () => {
    const response = proxy(request('//evil.example/x'));
    expect(getRedirectUrl(response)).toBe(`${ORIGIN}/sign-in?next=%2F`);
  });

  // An unrelated cookie is not a session: the check is for Better Auth's name.
  it('redirects when the only cookie is not a session cookie', () => {
    expect(proxy(request('/compendium', 'theme=dark')).status).toBe(307);
  });

  it.each([SESSION_COOKIE, `__Secure-${SESSION_COOKIE}`])(
    'lets a request carrying %s through to the page',
    (name) => {
      const response = proxy(request('/compendium', `${name}=token.signature`));

      expect(getRedirectUrl(response)).toBeNull();
      expect(response.headers.get('x-middleware-next')).toBe('1');
    },
  );

  // The page's secure check redirects too, for a cookie the database rejects,
  // and a server component has no other way to learn its own URL.
  it('forwards the return path to the page for its own redirect', () => {
    const response = proxy(request('/compendium?q=salt', `${SESSION_COOKIE}=t.s`));
    expect(forwarded(response, RETURN_PATH_HEADER)).toBe('/compendium?q=salt');
  });

  it('overwrites a return path the client supplied itself', () => {
    const response = proxy(
      request('/compendium', `${SESSION_COOKIE}=t.s`, { [RETURN_PATH_HEADER]: '/admin' }),
    );
    expect(forwarded(response, RETURN_PATH_HEADER)).toBe('/compendium');
  });
});

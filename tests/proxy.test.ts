import { NextRequest, type NextResponse } from 'next/server';
import {
  getRedirectUrl,
  getRewrittenUrl,
  unstable_doesMiddlewareMatch,
} from 'next/experimental/testing/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/session';
import { RETURN_PATH_HEADER } from '@/lib/sign-in';
import { ORIGIN, USER_ID } from './support/constants';
import { sessionFromHeaders } from './support/request-session';

// The session lookup is mocked; request-session.test.ts covers what it does with the answer.
vi.mock('@/lib/request-session', () => import('./support/request-session'));

const { config, proxy } = await import('@/proxy');

// Route protection is deny-by-default: the proxy names what is public, so a route nobody thought
// about is protected rather than open. The proxy's check is optimistic (a cookie is present);
// the page's requireSession() asks the database (claude-docs/auth/route-protection.md, "Route protection").

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

function forwarded(response: Response, name: string): string | null {
  return response.headers.get(`x-middleware-request-${name}`);
}

describe('the proxy matcher', () => {
  it.each([
    '/',
    '/sign-in',
    '/invite/2b7c5e2f8a',
    '/i/Xk7pQ2mR9tVw3nBc',
    '/compendium',
    '/compendium?entry=3f0d6a52-8c1e-4b7a-9e25-6d4c2b1a0f93',
    '/compendium/ingredients/testwort',
    '/support',
    '/privacy',
    '/disclaimer',
    '/about',
    '/terms',
    '/code-of-ethics',
    '/coven/hearth/grimoire/new?from=draft',
    '/curator/compendium',
    '/apiary',
    '/workshop',
    '/workshop/assets/index-B4mi58lY.js',
  ])('runs on the page %s', (path) => {
    expect(matches(path)).toBe(true);
  });

  // A file placed in public/ is a protected page to the matcher until it has an entry; imported assets ship under /_next/static/media.
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

  // The Workflow SDK's generated routes receive its own queue calls, which carry no cookie and a
  // body the proxy must not touch (it fails on a detached buffer when the proxy runs first).
  it.each(['/.well-known/workflow/v1/flow', '/.well-known/workflow/v1/step'])(
    'stays off the SDK route %s',
    (path) => {
      expect(matches(path)).toBe(false);
    },
  );

  it.each([
    '/.well-known/other',
    '/.well-known/ai-catalog.json',
    '/.well-known/workflowx/v1/flow',
    '/.well-known/workflow',
  ])('still runs on %s', (path) => {
    expect(matches(path)).toBe(true);
  });
});

describe('public routes', () => {
  it.each([
    '/',
    '/?ref=invite-email',
    '/sign-in',
    '/sign-in?next=%2Fcoven%2Fhearth&error=access_denied',
    '/invite/2b7c5e2f8a',
    '/forgot-password',
    '/reset-password?token=abc',
    '/reset-password?error=INVALID_TOKEN',
    '/access-paused',
    '/email/images/salt-dark.png',
    '/email/fonts/lexend-latin.woff2',
    '/compendium',
    '/compendium?category=herbs',
    '/compendium/ingredients/x',
    '/support',
    '/support?support=bug&error=404',
    // The public documents carry no application data.
    '/privacy',
    '/disclaimer',
    '/about',
    '/terms',
    '/code-of-ethics',
    '/help',
    '/help/glossary',
    '/help/getting-started',
    '/help/getting-started/signing-in',
    '/help/search',
    '/help/search?q=stock+levels',
    '/robots.txt',
    '/sitemap.xml',
    '/llms.txt',
    '/.well-known/ai-catalog.json',
    '/.well-known/ard.json',
    '/favicon.ico',
    '/manifest.webmanifest',
    // The site share card a link preview fetches for `/`, at the address Next gives it.
    '/opengraph-image',
    '/opengraph-image?1c801e44ee73c51d',
  ])('lets a signed-out request to %s through', async (path) => {
    const response = await proxy(request(path));

    expect(getRedirectUrl(response)).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  // Deny-by-default holds for lookalikes: an entry names a whole path, or a whole segment with `/*`, so
  // a page that merely starts with one, or shares its last segment, is protected.
  it.each([
    '/account/support',
    '/coven/hearth',
    '/coven/hearth/ingredients',
    '/keepers',
    '/curator',
  ])('redirects a signed-out request to the protected page %s', async (path) => {
    expect((await proxy(request(path))).status).toBe(307);
  });

  // An address that is no page at all holds no data to protect, so a signed-out visitor gets the 404 in
  // the public frame, not Sign In. Each is a lookalike of a public entry, which must not admit it as that
  // page either: it reaches routing, which has nothing to draw for it.
  it.each([
    '/nothing-here',
    '/sign-in-help',
    '/sign-in/elsewhere',
    '/forgot-password/x',
    '/reset-password/abc',
    '/access-paused/x',
    '/invites',
    '/icards/x',
    '/compendiums',
    '/compendium-admin',
    '/supports',
    '/robots.txt.bak',
    '/helpers',
    '/help-desk',
  ])('lets a signed-out request to the unknown address %s through to the 404', async (path) => {
    const response = await proxy(request(path));

    expect(getRedirectUrl(response)).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  // The staff help pages sit under the public /help but are for curators and keepers only.
  it.each(['/help/staff', '/help/staff/vocabularies', '/help/staff/vocabularies/forms'])(
    'redirects a signed-out request to the staff help page %s to sign in',
    async (path) => {
      expect((await proxy(request(path))).status).toBe(307);
    },
  );

  it('forwards the return path on a public route too', async () => {
    const response = await proxy(request('/invite/2b7c5e2f8a'));
    expect(forwarded(response, RETURN_PATH_HEADER)).toBe('/invite/2b7c5e2f8a');
  });
});

// Staging is a public URL, so off production every response asks search engines to index nothing.
describe('X-Robots-Tag', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    '/',
    '/compendium',
    '/robots.txt',
    '/llms.txt',
    '/.well-known/ai-catalog.json',
    '/.well-known/ard.json',
    '/coven/hearth',
  ])('is noindex off production on %s, a redirect included', async (path) => {
    vi.stubEnv('VERCEL_ENV', 'preview');

    expect((await proxy(request(path))).headers.get('x-robots-tag')).toBe('noindex');
  });

  it('is noindex when VERCEL_ENV is unset, as on a dev server', async () => {
    vi.stubEnv('VERCEL_ENV', '');

    expect((await proxy(request('/compendium'))).headers.get('x-robots-tag')).toBe('noindex');
  });

  it.each([
    '/',
    '/compendium',
    '/compendium/ingredients/testwort',
    '/privacy',
    '/disclaimer',
    '/about',
    '/terms',
    '/code-of-ethics',
    '/coven/hearth',
    // A filter is the page's own metadata to mark, not the proxy's.
    '/compendium?query=wort',
  ])('is absent on production at %s', async (path) => {
    vi.stubEnv('VERCEL_ENV', 'production');

    expect((await proxy(request(path))).headers.get('x-robots-tag')).toBeNull();
  });

  // An address that opens a dialog over a page is a copy of a real page: kept out of results, its
  // links still followed. Each name is its own case, so removing one from the proxy's list fails here.
  it.each([
    '/compendium?entry=3f0d6a52-8c1e-4b7a-9e25-6d4c2b1a0f93',
    '/compendium?query=wort&entry=3f0d6a52-8c1e-4b7a-9e25-6d4c2b1a0f93',
    '/?support=',
    '/privacy?support=',
    '/compendium/ingredients/testwort?support=',
  ])('is noindex, follow on production at %s', async (path) => {
    vi.stubEnv('VERCEL_ENV', 'production');

    expect((await proxy(request(path))).headers.get('x-robots-tag')).toBe('noindex, follow');
  });

  it.each(['/compendium?after=c', '/compendium?before=c'])(
    'leaves the compendium pager page %s indexable on production',
    async (path) => {
      vi.stubEnv('VERCEL_ENV', 'production');

      expect((await proxy(request(path))).headers.get('x-robots-tag')).toBeNull();
    },
  );

  it.each(['/compendium?entry=x', '/compendium?after=c', '/?support='])(
    'stays the blanket noindex off production at %s',
    async (path) => {
      vi.stubEnv('VERCEL_ENV', 'preview');

      expect((await proxy(request(path))).headers.get('x-robots-tag')).toBe('noindex');
    },
  );
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
    // Dropped, not replaced: a sign-in with no return path lands by role.
    expect(getRedirectUrl(response)).toBe(`${ORIGIN}/sign-in`);
  });

  it('redirects when the only cookie is not a session cookie', async () => {
    expect((await proxy(request('/coven/hearth', 'theme=dark'))).status).toBe(307);
  });

  it.each([SESSION_COOKIE, `__Secure-${SESSION_COOKIE}`])(
    'lets a request carrying %s through to the page',
    async (name) => {
      const response = await proxy(request('/coven/hearth', `${name}=token.signature`));

      expect(getRedirectUrl(response)).toBeNull();
      expect(response.headers.get('x-middleware-next')).toBe('1');
    },
  );

  // The page's secure check redirects too, for a cookie the database rejects,
  // and a server component has no other way to learn its own URL.
  it('forwards the return path to the page for its own redirect', async () => {
    const response = await proxy(request('/coven/hearth?q=salt', `${SESSION_COOKIE}=t.s`));
    expect(forwarded(response, RETURN_PATH_HEADER)).toBe('/coven/hearth?q=salt');
  });

  it('overwrites a return path the client supplied itself', async () => {
    const response = await proxy(
      request('/coven/hearth', `${SESSION_COOKIE}=t.s`, { [RETURN_PATH_HEADER]: '/keepers' }),
    );
    expect(forwarded(response, RETURN_PATH_HEADER)).toBe('/coven/hearth');
  });
});

// The staging workshop (claude-docs/workshop.md, "On staging"): Storybook's static build under
// public/workshop/, and the one path where the proxy asks the database, because those files
// have no page of their own to call requireSession().
describe('the workshop', () => {
  const signedIn = (path: string) => request(path, `${SESSION_COOKIE}=t.s`);
  const actAs = (role: Session['role']) =>
    sessionFromHeaders.mockResolvedValue({ userId: USER_ID, role });

  function reachesTheWorkshop(response: NextResponse): boolean {
    return (
      response.headers.get('x-middleware-next') === '1' ||
      (getRedirectUrl(response)?.startsWith(`${ORIGIN}/workshop/`) ?? false)
    );
  }

  // Each refusal is the gate reading who is asking: the same request with a keeper's live session reaches the files.
  async function expectAnAdminReaches(path: string) {
    expect(matches(path)).toBe(true);
    sessionFromHeaders.mockReset();
    actAs('admin');
    expect(reachesTheWorkshop(await proxy(signedIn(path)))).toBe(true);
  }

  const PATHS = [
    '/workshop?path=/story/layout-theme-toggle--states',
    '/workshop/index.html',
    '/workshop/iframe.html?id=layout-theme-toggle--states&viewMode=story',
    '/workshop/index.json',
    '/workshop/sb-manager/runtime.js',
  ];

  it.each(PATHS)('redirects a signed-out request for %s to /sign-in', async (path) => {
    const response = await proxy(request(path));

    expect(getRedirectUrl(response)).toBe(`${ORIGIN}/sign-in?next=${encodeURIComponent(path)}`);
    // The cookie-only check refuses it; the database is not asked.
    expect(sessionFromHeaders).not.toHaveBeenCalled();
    await expectAnAdminReaches(path);
  });

  // A cookie present but not live; the cookie-only check alone would let it through.
  it('redirects a cookie Better Auth does not recognise to /sign-in', async () => {
    sessionFromHeaders.mockResolvedValue(null);

    const response = await proxy(signedIn('/workshop/index.html'));

    expect(sessionFromHeaders).toHaveBeenCalledOnce();
    expect(getRedirectUrl(response)).toBe(`${ORIGIN}/sign-in?next=%2Fworkshop%2Findex.html`);
    await expectAnAdminReaches('/workshop/index.html');
  });

  // The cookie is real and the session live, so only the role refuses.
  describe.each(['user', 'curator'] as const)('a signed-in %s', (role) => {
    it.each(['/workshop', ...PATHS])('is refused %s with a plain 403', async (path) => {
      actAs(role);

      const response = await proxy(signedIn(path));

      expect(sessionFromHeaders.mock.calls[0]?.[0].get('cookie')).toBe(`${SESSION_COOKIE}=t.s`);
      expect(response.status).toBe(403);
      expect(response.headers.get('content-type')).toMatch(/^text\/plain/);
      expect(reachesTheWorkshop(response)).toBe(false);
      expect(getRewrittenUrl(response)).toBeNull();
      await expectAnAdminReaches(path);
    });
  });

  it.each([
    '/workshop/index.html',
    '/workshop/iframe.html?id=layout-theme-toggle--states&viewMode=story',
    '/workshop/index.json',
    '/workshop/project.json',
    '/workshop/sb-manager/runtime.js',
    '/workshop/assets/iframe-B4mi58lY.js',
  ])('lets a keeper through to %s', async (path) => {
    actAs('admin');

    const response = await proxy(signedIn(path));

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(forwarded(response, RETURN_PATH_HEADER)).toBe(path);
    // The precondition for the refusals above: the same path, signed out, is not served.
    expect(reachesTheWorkshop(await proxy(request(path)))).toBe(false);
  });

  // Storybook's build links its files relative to the page, so a page at /workshop would ask for
  // /iframe.html; Next serves no directory index and its trailing-slash redirect sends /workshop/
  // back to /workshop. So the bare path goes to the manager's file, where relative paths resolve.
  it('sends a keeper at the bare path to the manager page, query kept', async () => {
    actAs('admin');

    const response = await proxy(signedIn('/workshop?path=/story/layout-theme-toggle--states'));

    expect(response.status).toBe(307);
    expect(getRedirectUrl(response)).toBe(
      `${ORIGIN}/workshop/index.html?path=/story/layout-theme-toggle--states`,
    );
  });

  /** CSP Level 3 `connect-src`, falling back to `default-src`; throws on an unknown keyword. */
  function connectAllows(
    policy: string | null,
    url: string,
    page = `${ORIGIN}/workshop/index.html`,
  ): boolean {
    const directives = new Map(
      (policy ?? '')
        .split(';')
        .map((directive) => directive.trim().split(/\s+/))
        .filter(([name]) => name)
        .map(([name, ...sources]) => [name!.toLowerCase(), sources]),
    );
    const sources = directives.get('connect-src') ?? directives.get('default-src');
    if (!sources) return true;
    const target = new URL(url);
    const targetPath = decodeURIComponent(target.pathname);
    return sources.some((source) => {
      if (source === "'none'") return false;
      const expression = new URL(
        source.includes('://') ? source : `${new URL(page).protocol}//${source}`,
      );
      if (expression.origin !== target.origin) return false;
      const path = decodeURIComponent(expression.pathname);
      return path.endsWith('/') ? targetPath.startsWith(path) : targetPath === path;
    });
  }

  // The proxy may see another address than the browser's bar (`next start` on 0.0.0.0, a Docker port mapping, TLS ended upstream); the policy must name the browser's.
  it.each<{ seen: string; headers: Record<string, string>; page: string }>([
    {
      seen: 'http://0.0.0.0:8200/workshop/index.html',
      headers: { host: 'localhost:8000' },
      page: `${ORIGIN}/workshop/index.html`,
    },
    {
      seen: 'http://localhost:3001/workshop/index.html',
      headers: {
        host: 'localhost:3001',
        'x-forwarded-host': 'staging.example',
        'x-forwarded-proto': 'https',
      },
      page: 'https://staging.example/workshop/index.html',
    },
  ])('names the address the browser used, $page, not $seen', async ({ seen, headers, page }) => {
    actAs('admin');
    const response = await proxy(
      new NextRequest(seen, { headers: { ...headers, cookie: `${SESSION_COOKIE}=t.s` } }),
    );
    const policy = response.headers.get('content-security-policy');
    const origin = new URL(page).origin;

    // Why it matters: a policy naming the address the proxy saw refuses the file.
    expect(
      connectAllows(
        `connect-src ${new URL(seen).origin}/workshop/`,
        `${origin}/workshop/index.json`,
        page,
      ),
    ).toBe(false);
    expect(connectAllows(policy, `${origin}/workshop/index.json`, page)).toBe(true);
    expect(connectAllows(policy, `${origin}/api/graphql`, page)).toBe(false);
  });

  // The host is written into the header, so a value that is not a plain host
  // could add a source of its own; the proxy falls back to the host it saw.
  it.each(['evil.example *', 'localhost:8000; connect-src *'])(
    'does not write the forwarded host %j into the policy',
    async (forwardedHost) => {
      actAs('admin');
      const response = await proxy(
        new NextRequest(`${ORIGIN}/workshop/index.html`, {
          headers: { 'x-forwarded-host': forwardedHost, cookie: `${SESSION_COOKIE}=t.s` },
        }),
      );
      const policy = response.headers.get('content-security-policy');

      expect(connectAllows(policy, 'https://evil.example/x')).toBe(false);
      expect(connectAllows(policy, `${ORIGIN}/api/graphql`)).toBe(false);
      expect(connectAllows(policy, `${ORIGIN}/workshop/index.json`)).toBe(true);
    },
  );

  // The policy lets the workshop's code fetch Storybook's own files and nothing else on the origin.
  describe.each(['/workshop', '/workshop/index.html', '/workshop/iframe.html'])(
    "the admin's policy at %s",
    (path) => {
      const policy = async () => {
        actAs('admin');
        return (await proxy(signedIn(path))).headers.get('content-security-policy');
      };

      it.each([
        '/workshop/index.json',
        '/workshop/project.json',
        '/workshop/iframe.html',
        '/workshop/sb-addons/docs/manager-bundle.js',
      ])("allows Storybook's own %s", async (file) => {
        expect(connectAllows(await policy(), `${ORIGIN}${file}`)).toBe(true);
      });

      it.each([
        `${ORIGIN}/api/graphql`,
        `${ORIGIN}/api/auth/get-session`,
        `${ORIGIN}/compendium`,
        `${ORIGIN}/workshop`,
        `${ORIGIN}/workshopping/index.json`,
        'https://evil.example/workshop/index.json',
        'http://localhost:8001/workshop/index.json',
      ])('refuses %s', async (url) => {
        // Without the policy the request would go: the refusal is the policy's.
        expect(connectAllows(null, url)).toBe(true);
        expect(connectAllows(await policy(), url)).toBe(false);
      });
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

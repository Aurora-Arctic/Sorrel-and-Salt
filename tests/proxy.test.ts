import { NextRequest, type NextResponse } from 'next/server';
import {
  getRedirectUrl,
  getRewrittenUrl,
  unstable_doesMiddlewareMatch,
} from 'next/experimental/testing/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/lib/session';
import { RETURN_PATH_HEADER } from '@/lib/sign-in';

// The workshop gate asks Better Auth for the session; that lookup is mocked
// here, and request-session.test.ts covers what it does with the answer.
const sessionFromHeaders = vi.hoisted(() => vi.fn<(headers: Headers) => Promise<Session | null>>());
vi.mock('@/lib/request-session', () => ({ sessionFromHeaders }));

const { config, proxy } = await import('@/proxy');

// Route protection is deny-by-default: the proxy names what is public, so a route nobody thought
// about is protected rather than open. The proxy's check is optimistic (a cookie is present);
// the page's requireSession() asks the database (claude-docs/auth/route-protection.md, "Route protection").

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
    '/i/Xk7pQ2mR9tVw3nBc',
    '/compendium',
    '/coven/hearth/grimoire/new?from=draft',
    '/admin/compendium',
    '/apiary',
    '/workshop',
    '/workshop/assets/index-B4mi58lY.js',
  ])('runs on the page %s', (path) => {
    expect(matches(path)).toBe(true);
  });

  // Imported assets ship under /_next/static/media, so the backdrop's images are imported
  // rather than dropped into public/. Nothing in public/ is exempt: a file placed there is a
  // protected page to the matcher (redirected to /sign-in, HTML where the browser asked for an image) until its own entry is added.
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
    // Asking for a reset link, and the page the mailed link opens.
    '/forgot-password',
    '/reset-password?token=abc',
    '/reset-password?error=INVALID_TOKEN',
    // A mail client fetches the mail's images and fonts with no cookie.
    '/email/images/salt-dark.png',
    '/email/fonts/lexend-latin.woff2',
    // The one public surface, and the files a crawler or browser asks for.
    '/compendium',
    '/compendium?category=herbs',
    '/compendium/ingredients/x',
    // The support page offers a signed-out visitor Sign In and holds no data.
    '/support',
    '/support?support=bug&error=404',
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

  // Deny-by-default holds for lookalikes: an entry names a whole path, or a
  // whole segment with `/*`, so a route that merely starts with one is protected.
  it.each([
    '/sign-in-help',
    '/sign-in/elsewhere',
    '/forgot-password/x',
    '/reset-password/abc',
    '/invites',
    '/invite',
    '/i',
    '/icards/x',
    '/emails/x.png',
    '/compendiums',
    '/compendium-admin',
    '/support/other',
    '/supports',
    '/account/support',
    '/robots.txt.bak',
    '/llms.txt/x',
    '/opengraph-image/x',
    '/.well-known',
    '/coven/hearth',
    '/coven/hearth/ingredients',
  ])('redirects a signed-out request to the lookalike %s', async (path) => {
    expect((await proxy(request(path))).status).toBe(307);
  });

  // A public page that asks for a sign-in part-way — accepting an invitation —
  // needs its own path back, the same as a protected one.
  it('forwards the return path on a public route too', async () => {
    const response = await proxy(request('/invite/2b7c5e2f8a'));
    expect(forwarded(response, RETURN_PATH_HEADER)).toBe('/invite/2b7c5e2f8a');
  });
});

// Staging is a public URL, so off production every response asks search engines to index
// nothing. The test is VERCEL_ENV, as impersonation's is.
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

  it.each(['/', '/compendium', '/coven/hearth'])('is absent on production at %s', async (path) => {
    vi.stubEnv('VERCEL_ENV', 'production');

    expect((await proxy(request(path))).headers.get('x-robots-tag')).toBeNull();
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
    // Dropped, not replaced: a sign-in with no return path lands by role.
    expect(getRedirectUrl(response)).toBe(`${ORIGIN}/sign-in`);
  });

  // An unrelated cookie is not a session: the check is for Better Auth's name.
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
      request('/coven/hearth', `${SESSION_COOKIE}=t.s`, { [RETURN_PATH_HEADER]: '/admin' }),
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

  /** The request goes on to a file under /workshop/: passed through, or sent there. */
  function reachesTheWorkshop(response: NextResponse): boolean {
    return (
      response.headers.get('x-middleware-next') === '1' ||
      (getRedirectUrl(response)?.startsWith(`${ORIGIN}/workshop/`) ?? false)
    );
  }

  /**
   * Each refusal below is the gate reading who is asking, not a path the proxy never sees or a response that would have failed anyway:
   * the same request with an admin's live session reaches the files.
   */
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

  // A cookie present but not live — expired, revoked, forged. The cookie-only
  // check alone would have let it through to the files.
  it('redirects a cookie Better Auth does not recognise to /sign-in', async () => {
    sessionFromHeaders.mockResolvedValue(null);

    const response = await proxy(signedIn('/workshop/index.html'));

    expect(sessionFromHeaders).toHaveBeenCalledOnce();
    expect(getRedirectUrl(response)).toBe(`${ORIGIN}/sign-in?next=%2Fworkshop%2Findex.html`);
    await expectAnAdminReaches('/workshop/index.html');
  });

  // The cookie is real and the session live, so what refuses is the role and
  // nothing else. A curator curates the compendium and has no workshop.
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
  ])('lets an admin through to %s', async (path) => {
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
  it('sends an admin at the bare path to the manager page, query kept', async () => {
    actAs('admin');

    const response = await proxy(signedIn('/workshop?path=/story/layout-theme-toggle--states'));

    expect(response.status).toBe(307);
    expect(getRedirectUrl(response)).toBe(
      `${ORIGIN}/workshop/index.html?path=/story/layout-theme-toggle--states`,
    );
  });

  /**
   * Whether `policy`, on a page at `page`, lets scripts request `url`: CSP Level 3's `connect-src`, falling back to `default-src`.
   * A scheme-less source takes the page's; a source ending `/` matches every path beneath it; an unknown keyword throws.
   */
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

  // The proxy may see an address other than the one in the browser's bar: `next start` bound to
  // 0.0.0.0, a Docker port mapping, or a host that ends TLS and forwards plain http. The policy
  // must name the browser's address, or Storybook's own fetches are refused.
  it.each<{ seen: string; headers: Record<string, string>; page: string }>([
    {
      seen: 'http://0.0.0.0:8200/workshop/index.html',
      headers: { host: 'localhost:8000' },
      page: 'http://localhost:8000/workshop/index.html',
    },
    {
      seen: 'http://localhost:3000/workshop/index.html',
      headers: {
        host: 'localhost:3000',
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

  // The workshop's own code runs on this origin with an admin's cookie. The
  // policy lets it fetch Storybook's own files and nothing else on the origin.
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

import { afterEach, describe, expect, it, vi } from 'vitest';
import robots, { CRAWLABLE_PATHS, dynamic } from '@/app/robots';
import sitemap from '@/app/sitemap';

vi.mock('@/modules/ingredients', () => ({
  listCompendiumSlugs: vi.fn(async () => [
    { slug: 'testwort', name: 'Testwort', canonicalName: null, lastModified: new Date() },
  ]),
}));

// MB.84: a crawler is let into the public compendium on production and
// nowhere else; every other deploy asks to be left alone.

afterEach(() => vi.unstubAllEnvs());

describe('MB.84: robots', () => {
  // Next runs a metadata route once at build and keeps the answer unless it opts out, which
  // would freeze `VERCEL_ENV` at build time. Per request, the runtime's value decides.
  it('is read per request, so the runtime VERCEL_ENV decides and not the build', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('allows the compendium and nothing else on production, and names the sitemap', () => {
    vi.stubEnv('VERCEL_ENV', 'production');

    expect(robots()).toEqual({
      rules: { userAgent: '*', allow: CRAWLABLE_PATHS, disallow: '/' },
      sitemap: 'https://sorrelandsalt.com/sitemap.xml',
    });
    expect(CRAWLABLE_PATHS).toEqual([
      '/$',
      '/compendium',
      '/compendium/',
      '/sign-in',
      '/llms.txt',
      '/robots.txt',
      '/.well-known/ai-catalog.json',
      '/.well-known/ard.json',
      '/sitemap.xml',
    ]);
  });

  // The matching a crawler does (RFC 9309, 2.2.2 and 2.2.3): the longest matching
  // rule wins, an allow beating an equal disallow, and `$` ends a pattern.
  const allowed = (path: string) => {
    const matches = (rule: string) =>
      rule.endsWith('$') ? path === rule.slice(0, -1) : path.startsWith(rule);
    const best = Math.max(0, ...CRAWLABLE_PATHS.filter(matches).map((rule) => rule.length));
    return best >= 1;
  };

  it.each([
    ['/', true],
    ['/compendium', true],
    ['/compendium/ingredients/testwort', true],
    ['/llms.txt', true],
    ['/robots.txt', true],
    ['/.well-known/ai-catalog.json', true],
    ['/.well-known/ard.json', true],
    ['/.well-known/other.json', false],
    ['/coven/fixture-coven', false],
    ['/coven', false],
    ['/admin', false],
    ['/account', false],
    ['/invite/fixture-token', false],
    ['/api/graphql', false],
  ])('treats %s as crawlable: %s', (path, expected) => {
    expect(allowed(path)).toBe(expected);
  });

  // `Disallow: /` once blocked the very sitemap robots.txt named, so the two are tied together:
  // whatever sitemap the production rules advertise must itself be crawlable under them.
  it('lets a crawler fetch the sitemap it advertises', () => {
    vi.stubEnv('VERCEL_ENV', 'production');

    const { sitemap } = robots();

    expect(sitemap).toBeTypeOf('string');
    expect(allowed(new URL(sitemap as string).pathname)).toBe(true);
  });

  // The sitemap and robots.txt are two lists of the same public pages, so they are tied
  // together: a page the sitemap offers a crawler must be one the production rules let it fetch.
  it('allows every path the sitemap lists', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');

    const paths = (await sitemap()).map(({ url }) => new URL(url).pathname);

    expect(paths).toContain('/sign-in');
    expect(paths.filter((path) => !allowed(path))).toEqual([]);
  });

  it.each(['preview', 'development', undefined])('disallows everything under %s', (env) => {
    if (env) vi.stubEnv('VERCEL_ENV', env);
    else vi.stubEnv('VERCEL_ENV', '');

    expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });
});

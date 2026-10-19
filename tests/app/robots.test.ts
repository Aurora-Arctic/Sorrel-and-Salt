import { afterEach, describe, expect, it, vi } from 'vitest';
import robots, { CRAWLABLE_PATHS } from '@/app/robots';

// MB.84: a crawler is let into the public compendium on production and
// nowhere else; every other deploy asks to be left alone.

afterEach(() => vi.unstubAllEnvs());

describe('MB.84: robots', () => {
  it('allows the compendium and nothing else on production, and names the sitemap', () => {
    vi.stubEnv('VERCEL_ENV', 'production');

    expect(robots()).toEqual({
      rules: { userAgent: '*', allow: CRAWLABLE_PATHS, disallow: '/' },
      sitemap: 'https://sorrelandsalt.com/sitemap.xml',
    });
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
    ['/coven/fixture-coven', false],
    ['/coven', false],
    ['/admin', false],
    ['/account', false],
    ['/sign-in', false],
    ['/api/graphql', false],
  ])('treats %s as crawlable: %s', (path, expected) => {
    expect(allowed(path)).toBe(expected);
  });

  it.each(['preview', 'development', undefined])('disallows everything under %s', (env) => {
    if (env) vi.stubEnv('VERCEL_ENV', env);
    else vi.stubEnv('VERCEL_ENV', '');

    expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });
});

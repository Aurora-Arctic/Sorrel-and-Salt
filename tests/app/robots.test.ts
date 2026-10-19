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
    expect(CRAWLABLE_PATHS).toEqual(['/compendium', '/compendium/']);
  });

  it.each(['preview', 'development', undefined])('disallows everything under %s', (env) => {
    if (env) vi.stubEnv('VERCEL_ENV', env);
    else vi.stubEnv('VERCEL_ENV', '');

    expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });
});

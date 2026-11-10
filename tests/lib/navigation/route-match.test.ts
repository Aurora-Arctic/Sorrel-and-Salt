import { describe, expect, it, vi } from 'vitest';

// The matcher reads its patterns from the skeleton registry. A registry of its
// own here, so each rule is proved against patterns chosen to test it; the
// dynamic patterns come first, so the order they are listed in decides nothing.
const Blank = () => null;
vi.mock('@/app/skeletons', () => ({
  skeletons: {
    '/coven/[slug]': { host: 'coven', Skeleton: Blank },
    '/coven/[slug]/grimoire/[id]': { host: 'coven', Skeleton: Blank },
    '/coven/[slug]/grimoire/drafts': { host: 'coven', Skeleton: Blank },
    '/coven/[slug]/members': { host: 'coven', Skeleton: Blank },
    '/coven/new': { host: 'main', Skeleton: Blank },
    '/coven': { host: 'main', Skeleton: Blank },
    '/compendium/ingredients/[slug]': { host: 'main', Skeleton: Blank },
    '/curator/categories': { host: 'admin', Skeleton: Blank },
    '/': { host: 'main', Skeleton: Blank },
  },
}));

const { matchRoute } = await import('@/lib/navigation/route-match');

// Which page an address opens, as the folders under src/app name it, so the
// destination's own skeleton can be drawn while it is on its way
// (claude-docs/design-decisions/m11.9-plan.md, Part 1).
describe('matchRoute', () => {
  it('names the pattern and the values of its dynamic segments', () => {
    expect(matchRoute('/coven/testwort-circle/grimoire/7f3a')).toEqual({
      pattern: '/coven/[slug]/grimoire/[id]',
      params: { slug: 'testwort-circle', id: '7f3a' },
    });
  });

  it('matches a static pattern with no params', () => {
    expect(matchRoute('/coven')).toEqual({ pattern: '/coven', params: {} });
  });

  it('matches the home page', () => {
    expect(matchRoute('/')).toEqual({ pattern: '/', params: {} });
  });

  it('ignores the query string and the hash', () => {
    expect(matchRoute('/compendium/ingredients/testwort?q=root#uses')).toEqual({
      pattern: '/compendium/ingredients/[slug]',
      params: { slug: 'testwort' },
    });
    expect(matchRoute('/coven?card=accepted')).toEqual({ pattern: '/coven', params: {} });
    expect(matchRoute('/coven#top')).toEqual({ pattern: '/coven', params: {} });
  });

  it('ignores a trailing slash', () => {
    expect(matchRoute('/coven/testwort-circle/')).toEqual({
      pattern: '/coven/[slug]',
      params: { slug: 'testwort-circle' },
    });
  });

  // `/coven/new` would also fit `/coven/[slug]`: Next serves the static folder.
  it('prefers a static segment to a dynamic one', () => {
    expect(matchRoute('/coven/new')).toEqual({ pattern: '/coven/new', params: {} });
    expect(matchRoute('/coven/testwort-circle/grimoire/drafts')).toEqual({
      pattern: '/coven/[slug]/grimoire/drafts',
      params: { slug: 'testwort-circle' },
    });
    // Why the static win is a choice: the same shape with another value is dynamic.
    expect(matchRoute('/coven/testwort-circle/grimoire/8c1d')?.pattern).toBe(
      '/coven/[slug]/grimoire/[id]',
    );
  });

  // A route group's folder and a slot's folder add no segment to the address.
  it('matches an address whose page sits in a route group or beside a slot', () => {
    expect(matchRoute('/curator/categories')).toEqual({
      pattern: '/curator/categories',
      params: {},
    });
    expect(matchRoute('/coven/testwort-circle/members')).toEqual({
      pattern: '/coven/[slug]/members',
      params: { slug: 'testwort-circle' },
    });
  });

  it('returns null for an address no page answers', () => {
    expect(matchRoute('/nowhere')).toBeNull();
    // One segment too many, and one too few, for every pattern that shares its start.
    expect(matchRoute('/coven/testwort-circle/grimoire/7f3a/extra')).toBeNull();
    expect(matchRoute('/compendium/ingredients')).toBeNull();
    // A group's or a slot's folder name is not a segment of any address.
    expect(matchRoute('/curator/(categories)/categories')).toBeNull();
    expect(matchRoute('/coven/testwort-circle/@action/members')).toBeNull();
  });
});

// The app's own registry, which the matcher reads in production: a pattern is
// the address's shape, so no group or slot folder is ever written into one.
describe('the skeleton registry', () => {
  it('writes no route group or slot into any pattern', async () => {
    const { skeletons } =
      await vi.importActual<typeof import('@/app/skeletons')>('@/app/skeletons');
    const patterns = Object.keys(skeletons);

    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns.filter((pattern) => /\/[(@]/.test(pattern))).toEqual([]);
    expect(patterns.filter((pattern) => pattern !== '/' && pattern.endsWith('/'))).toEqual([]);
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pagePatterns, publicFiles, routesSource } from '../../scripts/page-routes';
import { fromRoot } from '../support/paths';

// The proxy lets an address that is no page through to the 404, judging by a list generated from
// src/app and public/. A page added without regenerating it would answer a signed-out visitor
// with a 404 instead of Sign In (claude-docs/design-decisions/mb.124-signed-out-404-route-list.md).

describe('the generated page route list', () => {
  it('names every page and every public file, as the folders spell them', () => {
    const patterns = pagePatterns(fromRoot('src/app'));
    // Preconditions: the scan reaches groups, slots, dynamic segments and the root page.
    expect(patterns).toContain('/');
    expect(patterns).toContain('/coven/[slug]/grimoire/[id]');
    expect(patterns).toContain('/curator/categories');
    expect(patterns).toContain('/coven/[slug]/members');
    expect(patterns.filter((pattern) => pattern.includes('('))).toEqual([]);
    expect(patterns.filter((pattern) => pattern.includes('@'))).toEqual([]);
    expect(publicFiles(fromRoot('public'))).toContain('/email/images/salt-dark.png');
  });

  it('matches the committed file, so a new page needs `npm run generate:routes`', () => {
    expect(readFileSync(fromRoot('src/lib/page-routes.ts'), 'utf8')).toBe(routesSource());
  });
});

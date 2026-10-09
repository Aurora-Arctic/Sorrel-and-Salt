import { describe, expect, inject, it } from 'vitest';

// The browser reaches the server through `/api/graphql` and Better Auth's
// `/api/auth/*`, and nothing else (CLAUDE.md rule 1; claude-docs/graphql/two-transports.md,
// "The two transports") — admin included. A route handler is the other way a
// page could write without GraphQL, beside the server action
// no-server-actions.test.ts refuses, and it is a file rather than an import,
// so no lint rule sees it. Untracked files are scanned too, for the reason
// slug-rule.test.ts gives: the listing is the unit project's shared one (MB.184).

/** Every extension Next accepts for a `route` file. */
const ROUTE_FILE = /\/route\.(?:ts|tsx|js|jsx|mjs)$/;

const ALLOWED = ['src/app/api/auth/[...all]/route.ts', 'src/app/api/graphql/route.ts'];

function appFiles(): string[] {
  return inject('repoFiles').filter((file) => file.startsWith('src/app/'));
}

const FILES = appFiles();

describe('route handlers', () => {
  // Precondition: an empty listing has no stray handler in it either.
  it('is scanning the app directory', () => {
    expect(FILES.length).toBeGreaterThan(10);
    expect(FILES).toContain('src/app/layout.tsx');
  });

  // Proves the pattern can fire, and that a page or a lookalike does not.
  it('recognises a route file and only a route file', () => {
    expect(ROUTE_FILE.test('src/app/admin/forms/route.ts')).toBe(true);
    expect(ROUTE_FILE.test('src/app/admin/route.js')).toBe(true);
    expect(ROUTE_FILE.test('src/app/admin/page.tsx')).toBe(false);
    expect(ROUTE_FILE.test('src/app/admin/reroute.ts')).toBe(false);
  });

  it('are the GraphQL endpoint and the auth handshake, and no others', () => {
    expect(FILES.filter((file) => ROUTE_FILE.test(file))).toEqual(ALLOWED);
  });
});

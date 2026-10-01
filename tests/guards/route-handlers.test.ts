import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// The browser reaches the server through `/api/graphql` and Better Auth's
// `/api/auth/*`, and nothing else (CLAUDE.md rule 1; claude-docs/graphql/two-transports.md,
// "The two transports") — admin included. A route handler is the other way a
// page could write without GraphQL, beside the server action
// no-server-actions.test.ts refuses, and it is a file rather than an import,
// so no lint rule sees it. Untracked files are scanned too, for the reason
// slug-rule.test.ts gives.

/** Every extension Next accepts for a `route` file. */
const ROUTE_FILE = /\/route\.(?:ts|tsx|js|jsx|mjs)$/;

const ALLOWED = ['src/app/api/auth/[...all]/route.ts', 'src/app/api/graphql/route.ts'];

function appFiles(): string[] {
  const args = ['-c', 'safe.directory=*', 'ls-files', '--cached', '--others', '--exclude-standard'];
  return execFileSync('git', [...args, 'src/app/'], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
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

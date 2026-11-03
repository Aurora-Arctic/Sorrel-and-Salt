import { readFileSync } from 'node:fs';
import { describe, expect, it, inject } from 'vitest';

// The admin area's addresses moved to `/curator` and `/keepers`, and the old ones are gone with no redirect, so
// nothing in `src/` may still name one: a link, a `Route` constant, a kind table, a story or a comment. Better Auth's
// own admin endpoints are mounted under `/api/auth` and keep their `/admin/...` paths (claude-docs/components/admin-nav.md).

// A path segment `/admin` on its own: not `./admin-roles`, not `assertSiteAdmin`.
const ADMIN_ADDRESS = /(?<![\w.-])\/admin(?![\w-])(\/[\w-]+)?/g;
// The Better Auth admin plugin's endpoints, which the app calls under `/api/auth`.
const BETTER_AUTH = /^\/admin\/(impersonate-user|stop-impersonating)$/;

describe('addresses under /admin', () => {
  it('are named nowhere in src/ but as Better Auth’s endpoints', () => {
    const files = inject('repoFiles').filter((file) => /^src\/.*\.(tsx?|scss|mdx?)$/.test(file));
    const found = files.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(ADMIN_ADDRESS)].map(([match]) => ({ file, match })),
    );

    // Preconditions: the scan read the source, and it sees Better Auth's endpoints, which stay.
    expect(files.length).toBeGreaterThan(100);
    expect(found.filter(({ match }) => BETTER_AUTH.test(match)).length).toBeGreaterThan(0);
    expect(
      found
        .filter(({ match }) => !BETTER_AUTH.test(match))
        .map(({ file, match }) => `${file}: ${match}`),
    ).toEqual([]);
  });
});

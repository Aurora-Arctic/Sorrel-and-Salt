import { readFileSync } from 'node:fs';
import { describe, expect, it, inject } from 'vitest';

// The old admin addresses are gone with no redirect, so nothing in `src/` may name one; Better Auth's own admin endpoints keep `/admin/...` under `/api/auth` (claude-docs/components/admin-nav.md).

const ADMIN_ADDRESS = /(?<![\w.-])\/admin(?![\w-])(\/[\w-]+)?/g;
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

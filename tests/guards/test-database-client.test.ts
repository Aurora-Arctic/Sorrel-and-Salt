import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';
import { fromRoot } from '../support/paths';

// A `db` test opens its per-file client through `useTestDatabase`, which ends it before the harness re-clones the
// worker's database `WITH (FORCE)` (claude-docs/testing/db-harness.md, "The db test harness — `tests/support/db/`").
// A client opened by hand skips the shared options and, when nothing ends it, leaks a connection until that drop.

const OPENS_BY_HAND = /\bpostgres\(process\.env\.DATABASE_URL/;
const OPENS_ANY = /\bpostgres\(/;
const ENDS = /\.end\(\)/;

// Each of these opens a second client on purpose and ends it itself.
const OWN_CLIENT: Record<string, string> = {
  'tests/db/connection-under-msw.test.ts':
    'opens the client mid-test to prove the driver works under msw',
  'tests/modules/identity/services/user-role.test.ts':
    'the seed needs a client drizzle has not rewired',
};

const HELPER = 'tests/support/db/database.ts';
// A factory that returns the client to its caller, who ends it.
const FACTORY = 'tests/support/db/bounded-postgres.ts';
// The e2e harness opens clients against its own per-worker databases, not through the db project's harness.
const files = inject('repoFiles').filter(
  (file) => /^tests\/.*\.tsx?$/.test(file) && !file.startsWith('tests/e2e/'),
);
const source = (file: string) => readFileSync(fromRoot(file), 'utf8');

describe('how a test opens its database client', () => {
  it('opens no client by hand outside the shared helper and the named exceptions', () => {
    // Precondition: the scan sees the helper and the exceptions, so an empty result is not an empty scan.
    expect(files).toContain(HELPER);
    for (const file of Object.keys(OWN_CLIENT)) expect(files).toContain(file);
    expect(OPENS_BY_HAND.test(source(HELPER))).toBe(true);

    const byHand = files.filter(
      (file) => file !== HELPER && !(file in OWN_CLIENT) && OPENS_BY_HAND.test(source(file)),
    );

    expect(byHand).toEqual([]);
  });

  it('ends every client a test file opens', () => {
    const neverEnded = files.filter((file) => {
      if (file === FACTORY) return false;
      const text = source(file);
      return OPENS_ANY.test(text) && !ENDS.test(text);
    });

    // Precondition: files that open a client exist, and the check can tell an ended one from one that is not.
    expect(files.filter((file) => OPENS_ANY.test(source(file))).length).toBeGreaterThan(1);
    expect(neverEnded).toEqual([]);
  });
});

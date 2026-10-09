import type { ProbeSet } from '../types';

// The probes of tests/guards/lint-db-client-boundary.test.ts: only
// `src/db/repository/` may import the database client (CLAUDE.md rule 2), and
// only the database layer may import `drizzle-orm` at runtime (rule 4).
// Written and linted once by unit-global-setup.ts.
//
// Probes are written to throwaway `__lint-probe__` directories inside the
// repo, since both rules are path-scoped and a file in `tmpdir` matches no
// `overrides` block; not committed, since oxlint skips anything matched by
// `ignorePatterns` even when passed explicitly (`--no-ignore` does not override it).

/** Untracked, gitignored, and removed once linted. */
const PROBE = '__lint-probe__';

/**
 * Everywhere the query-builder ban applies. `tests/db` is exempt below; the
 * rest of `tests/` is application code as far as rule 4 is concerned, and a
 * probe in each proves the exemption has not widened to the whole suite.
 */
export const RESTRICTED = [
  'src/modules/coven/services',
  'src/graphql',
  'src/app',
  'src/components',
  'src/lib',
  'tests/e2e',
  'tests/lib',
  'tests/support',
  'tests/guards',
];

/**
 * The database layer, which builds queries for a living, a module's schema
 * files, which build tables with the same package — and the tests of both.
 */
export const EXEMPT = [
  'src/db',
  'src/modules/identity/schema',
  'scripts',
  'tests/db',
  'tests/db/seed',
  'tests/support/db',
];

/**
 * Files whose import of the client is exempted by a disable comment: the
 * repository's three that run a query — its transaction, its select and its
 * one users delete — and three outside it that need a client, not a writer.
 */
export const CLIENT_EXEMPT = [
  'src/db/repository/write.ts',
  'src/db/repository/select.ts',
  'src/db/repository/provisional-users.ts',
  'src/lib/auth.ts',
  'scripts/db-seed.ts',
  'tests/db/test-database-isolation.test.ts',
];

/** Probe files, keyed by the repo-relative path each is written to. */
const probes = new Map<string, string>();

/** Register a probe and return its path, for use as a lookup key. */
function probe(directory: string, name: string, source: string): string {
  const file = `${directory}/${PROBE}/${name}.ts`;
  probes.set(file, source);
  return file;
}

// Rule 1 — every shape an importer can reach connection.ts by. The `@/` alias
// is the one that matters: the ban is a set of path globs, and `@/db/connection`
// is not the relative shape any of the other five describe.
export const CLIENT_SPECIFIERS = [
  './connection',
  '../connection',
  '../../db/connection',
  '../../../../db/connection',
  '../src/db/connection.ts',
  '@/db/connection',
];
export const clientProbes = CLIENT_SPECIFIERS.map((specifier) =>
  probe(
    'src/modules/coven/services',
    `client-${specifier.replace(/\W/g, '')}`,
    `import { db } from '${specifier}';\nexport const smuggled = db;\n`,
  ),
);
export const clientTypeProbe = probe(
  'src/modules/coven/services',
  'client-type',
  "import type { db } from '../db/connection';\nexport type D = typeof db;\n",
);
export const siblingModuleProbe = probe(
  'src/modules/coven/services',
  'sibling-module',
  "import { withAudit } from '../../../../db/repository';\nexport const w = withAudit;\n",
);

// Rule 2 — a runtime import of the query builder from each restricted
// location, the same import as a type, and the subpath form.
export const runtimeProbes = Object.fromEntries(
  RESTRICTED.map((directory) => [
    directory,
    probe(directory, 'runtime', "import { eq } from 'drizzle-orm';\nexport const e = eq;\n"),
  ]),
);
export const typeOnlyProbes = Object.fromEntries(
  RESTRICTED.map((directory) => [
    directory,
    probe(
      directory,
      'type-only',
      "import type { SQL } from 'drizzle-orm';\nexport type S = SQL | undefined;\n",
    ),
  ]),
);
export const subpathProbe = probe(
  'src/graphql',
  'subpath',
  "import { pgTable } from 'drizzle-orm/pg-core';\nexport const t = pgTable;\n",
);

// The exempt tier: the database layer builds queries, and still may not reach
// the client outside the repository.
export const exemptRuntimeProbes = Object.fromEntries(
  EXEMPT.map((directory) => [
    directory,
    probe(directory, 'runtime', "import { eq } from 'drizzle-orm';\nexport const e = eq;\n"),
  ]),
);
export const exemptClientProbe = probe(
  'src/db',
  'client',
  "import { db } from '../../db/connection';\nexport const smuggled = db;\n",
);

export const dbClientBoundary: ProbeSet = {
  name: 'lint-db-client-boundary',
  probes,
  directories: [...RESTRICTED, ...EXEMPT].map((directory) => `${directory}/${PROBE}`),
  files: [...CLIENT_EXEMPT, 'drizzle.config.ts'],
};

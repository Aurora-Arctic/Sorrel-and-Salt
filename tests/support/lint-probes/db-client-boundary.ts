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

/** Untracked, gitignored by name, and removed once linted. */
const SERVICES_PROBES = 'src/modules/coven/services/__lint-probe__';
const GRAPHQL_PROBES = 'src/graphql/__lint-probe__';

/**
 * The client by the `@/` alias, from a service: the spelling that matters,
 * since the ban is a set of path globs and the alias is not a relative shape.
 */
export const clientProbe = `${SERVICES_PROBES}/client.ts`;

/** A runtime import of the query builder from the GraphQL layer. */
export const drizzleProbe = `${GRAPHQL_PROBES}/runtime.ts`;

export const dbClientBoundary: ProbeSet = {
  name: 'lint-db-client-boundary',
  probes: new Map([
    [clientProbe, "import { db } from '@/db/connection';\nexport const smuggled = db;\n"],
    [drizzleProbe, "import { eq } from 'drizzle-orm';\nexport const e = eq;\n"],
  ]),
  directories: [SERVICES_PROBES, GRAPHQL_PROBES],
  files: [],
};

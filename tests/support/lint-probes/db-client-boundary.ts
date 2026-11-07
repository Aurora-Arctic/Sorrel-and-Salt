import type { ProbeSet } from '../types';

// The probes of tests/guards/lint-db-client-boundary.test.ts: only `src/db/repository/` may import the
// database client (CLAUDE.md rule 2) and only the database layer `drizzle-orm` at runtime (rule 4). Written
// and linted once by unit-global-setup.ts, in throwaway `__lint-probe__` directories: oxlint skips `ignorePatterns` files.

export const CLIENT_EXEMPT = [
  'src/db/repository/write.ts',
  'src/db/repository/select.ts',
  'src/db/repository/provisional-users.ts',
  'src/db/repository/sign-in-failures.ts',
  'src/db/repository/passkeys.ts',
  'src/lib/auth.ts',
  'scripts/db-seed.ts',
  'tests/db/test-database-isolation.test.ts',
];

const SERVICES_PROBES = 'src/modules/coven/services/__lint-probe__';
const GRAPHQL_PROBES = 'src/graphql/__lint-probe__';

// The `@/` alias: the ban is a set of path globs and the alias is not a relative shape.
export const clientProbe = `${SERVICES_PROBES}/client.ts`;

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

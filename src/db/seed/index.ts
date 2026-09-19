import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { seedDemo } from './demo';
import { seedMinimal } from './minimal';
import { seedStandard } from './standard';

export type SeedScenario = 'minimal' | 'standard' | 'demo';

/**
 * What `drizzle(client)` actually returns. `PostgresJsDatabase` bare defaults
 * its schema parameter to `Record<string, never>`, which the real handle —
 * `Record<string, unknown>`, from connection.ts and any test's own `drizzle()`
 * — is not assignable to. The stub declared the bare form and nothing caught
 * it, because `scripts/` is outside tsconfig's `include`; the first consumer
 * inside it (src/db/seed/index.test.ts) did.
 */
export type SeedDatabase = PostgresJsDatabase<Record<string, unknown>>;

/**
 * The handle inside `db.transaction()`. Named here so a seed module can take
 * one as a parameter — M4.3's bootstrap-admin insert runs inside the caller's
 * transaction rather than opening a second one.
 */
export type SeedTransaction = Parameters<Parameters<SeedDatabase['transaction']>[0]>[0];

/**
 * One seed module, used by Docker, Vitest and Playwright alike (CLAUDE.md's
 * Testing section) so a bug reproduces identically in all three. Each
 * consumer hands over its own database handle, and the seed writes through
 * it — see src/db/seed/minimal.ts for why that is a handle and not
 * `withAudit`.
 *
 * The three scenarios landed one task at a time — `minimal` in M1.21,
 * `standard` in M1.22, `demo` in M1.23 — and each builds on the one before:
 * `demo` is `standard` plus a grimoire, inside the same transaction.
 */
export async function seed(
  db: SeedDatabase,
  { scenario }: { scenario: SeedScenario },
): Promise<void> {
  switch (scenario) {
    case 'minimal':
      return seedMinimal(db);
    case 'standard':
      return seedStandard(db);
    case 'demo':
      return seedDemo(db);
  }
}

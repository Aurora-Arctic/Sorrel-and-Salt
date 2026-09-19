import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { seedDemo } from './demo';
import { seedMinimal } from './minimal';
import { seedStandard } from './standard';

/**
 * The three scenarios, in the order they build on each other — `standard` is
 * `minimal` plus a cast and a compendium, `demo` is `standard` plus a
 * grimoire. Exported as the list rather than only as the union so
 * `resolveScenario` can name the valid values in its error and a test can
 * iterate them, instead of either restating them.
 */
export const SEED_SCENARIOS = ['minimal', 'standard', 'demo'] as const;

export type SeedScenario = (typeof SEED_SCENARIOS)[number];

/**
 * A `SEED_SCENARIO` environment value turned into a scenario (M1.24). Both
 * consumers of that variable go through this: `scripts/db-seed.ts` and, by way
 * of it, the `db-init` compose service that seeds a clean volume on the first
 * `make docker-up`.
 *
 * Unset or blank means `minimal` — the bare install, the safe default for a
 * developer who never thought about scenarios. Anything else that is not a
 * scenario **throws**: falling back would mean someone who asked for `demo`
 * and mistyped it gets one admin and one user, and then debugs the app rather
 * than the variable.
 */
export function resolveScenario(value: string | undefined): SeedScenario {
  const name = value?.trim();
  if (!name) return 'minimal';

  const scenario = SEED_SCENARIOS.find((candidate) => candidate === name);
  if (!scenario) {
    throw new Error(
      `Unknown seed scenario "${name}". SEED_SCENARIO must be one of: ${SEED_SCENARIOS.join(', ')}.`,
    );
  }
  return scenario;
}

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

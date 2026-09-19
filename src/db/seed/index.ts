import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { seedDemo } from './demo';
import { seedMinimal } from './minimal';
import { seedStandard } from './standard';

/**
 * The three scenarios, in the order they build on each other: `standard` is
 * `minimal` plus a cast and a compendium, `demo` is `standard` plus a grimoire.
 * Exported as a list so `resolveScenario`'s error can name the valid values
 * rather than restate them.
 */
export const SEED_SCENARIOS = ['minimal', 'standard', 'demo'] as const;

export type SeedScenario = (typeof SEED_SCENARIOS)[number];

/**
 * A `SEED_SCENARIO` environment value turned into a scenario.
 *
 * Unset or blank means `minimal`. Anything else that is not a scenario
 * **throws** rather than falling back: someone who mistypes `demo` would
 * otherwise get one admin and one user, and debug the app rather than the
 * variable.
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
 * What `drizzle(client)` actually returns. Bare `PostgresJsDatabase` defaults
 * its schema parameter to `Record<string, never>`, which a real handle is not
 * assignable to — and `scripts/` is outside tsconfig's `include`, so nothing
 * there would catch the bare form.
 */
export type SeedDatabase = PostgresJsDatabase<Record<string, unknown>>;

/**
 * The handle inside `db.transaction()`, named so a seed module can take one as
 * a parameter and run inside the caller's transaction rather than a second one.
 */
export type SeedTransaction = Parameters<Parameters<SeedDatabase['transaction']>[0]>[0];

/**
 * One seed module, used by Docker, Vitest and Playwright alike so a bug
 * reproduces identically in all three. Each consumer hands over its own
 * database handle and the seed writes through it — see minimal.ts for why that
 * is a handle and not `withAudit`.
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

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { seedDemo } from './demo';
import { seedMinimal } from './minimal';
import { seedStandard } from './standard';

/** The three scenarios, each building on the last. A list so `resolveScenario`'s error can name them. */
export const SEED_SCENARIOS = ['minimal', 'standard', 'demo'] as const;

export type SeedScenario = (typeof SEED_SCENARIOS)[number];

/** `SEED_SCENARIO` resolved: unset or blank means `minimal`; an unrecognised name throws rather than falling back. */
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
 * What `drizzle(client)` returns: bare `PostgresJsDatabase` defaults its schema
 * to `Record<string, never>`, which a real handle is not assignable to.
 */
export type SeedDatabase = PostgresJsDatabase<Record<string, unknown>>;

/** The handle inside `db.transaction()`, so a seed module can run inside the caller's transaction. */
export type SeedTransaction = Parameters<Parameters<SeedDatabase['transaction']>[0]>[0];

/** One seed module for Docker, Vitest and Playwright; each hands over its own handle (claude-docs/db.md, "The seed module"). */
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

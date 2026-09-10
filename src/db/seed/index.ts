import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export type SeedScenario = 'minimal' | 'standard' | 'demo';

/**
 * One seed module, used by Docker, Vitest and Playwright alike (CLAUDE.md's
 * Testing section) so a bug reproduces identically in all three.
 *
 * Scenario content lands scenario by scenario: `minimal` in M1.21,
 * `standard` in M1.22, `demo` in M1.23. Every scenario throws until its task
 * lands — none can seed anything real before src/db/schema has tables.
 */
export async function seed(
  _db: PostgresJsDatabase,
  { scenario }: { scenario: SeedScenario },
): Promise<void> {
  throw new Error(`Seed scenario "${scenario}" is not implemented yet.`);
}

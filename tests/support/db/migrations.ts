import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { MIGRATIONS_DIR } from '../paths';

/**
 * The statements of the first shipped migration whose text contains `marker`,
 * comment lines stripped — for a test that re-runs a migration's own SQL
 * rather than a copy of it. Throws when no migration contains it.
 */
export function statementsOfMigrationContaining(marker: string): string[] {
  const file = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => join(MIGRATIONS_DIR, name))
    .find((path) => readFileSync(path, 'utf8').includes(marker));

  if (!file) throw new Error(`No migration in src/db/migrations contains ${marker}`);

  return readFileSync(file, 'utf8')
    .split('--> statement-breakpoint')
    .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);
}

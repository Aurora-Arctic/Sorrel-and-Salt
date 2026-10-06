import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { MIGRATIONS_DIR } from '../paths';

/** Every statement in every shipped migration, comment lines stripped. */
export function shippedMigrationStatements(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .flatMap((file) =>
      readFileSync(join(MIGRATIONS_DIR, file), 'utf8').split('--> statement-breakpoint'),
    )
    .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);
}

// drizzle-kit writes `REFERENCES "public"."users"("id")`, so the schema
// qualifier is optional rather than absent; the trailing `\s` / `\(` stops
// `ingredients` matching `ingredients_x`.
function tableName(name: string): string {
  return `(?:"?public"?\\.)?"?${name}"?`;
}

/**
 * The statements giving `from` a foreign key onto `to`: an `ALTER TABLE … REFERENCES`,
 * as drizzle-kit emits one, or an inline `REFERENCES` in the `CREATE TABLE`.
 * Read per statement, so a later statement's `REFERENCES` is not attributed to
 * an earlier `ALTER TABLE`.
 */
export function foreignKeyStatements(statements: string[], from: string, to: string): string[] {
  const target = `\\breferences\\s+${tableName(to)}\\s*\\(`;
  const alter = new RegExp(
    `^alter\\s+table\\s+(?:only\\s+)?${tableName(from)}\\s[\\s\\S]*${target}`,
    'i',
  );
  const create = new RegExp(
    `^create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?${tableName(from)}\\s*\\([\\s\\S]*${target}`,
    'i',
  );

  return statements.filter((statement) => alter.test(statement) || create.test(statement));
}

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

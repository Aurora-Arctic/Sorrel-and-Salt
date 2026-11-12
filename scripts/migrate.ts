/**
 * `npm run db:migrate [migrationsFolder]`: applies the pending migrations through drizzle's own migrator, in the one transaction it opens, and on failure prints what Postgres said.
 * `drizzle-kit migrate` exits 1 on a failure without printing it. The journal it writes is the same, so a database either command migrated is readable by both (claude-docs/db/migrations-and-scripts.md).
 * Nothing printed carries `DATABASE_URL`, as with scripts/probe-database.ts.
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import postgres from 'postgres';

import { withMigrationLockTimeout, withoutClientOnlyParams } from '../src/db/connection-url.ts';
import { describeConnectionError } from './probe-database.ts';

const DEFAULT_FOLDER = 'src/db/migrations';

/** The `.sql` file holding a statement, found by the journal's order, which is the order the migrator reads in. */
function fileOfStatement(folder: string, statement: string): string | undefined {
  const journal = JSON.parse(readFileSync(join(folder, 'meta/_journal.json'), 'utf8')) as {
    entries: { tag: string }[];
  };
  const migrations = readMigrationFiles({ migrationsFolder: folder });
  const index = migrations.findIndex((migration) => migration.sql.includes(statement));
  return index === -1 ? undefined : `${journal.entries[index].tag}.sql`;
}

/** drizzle wraps the driver's error and carries the failed statement beside it. */
function describeMigrationFailure(error: unknown, folder: string, url: string | undefined): string {
  const statement = (error as { query?: unknown } | null)?.query;
  const cause = (error as { cause?: unknown } | null)?.cause;
  const file = typeof statement === 'string' ? fileOfStatement(folder, statement) : undefined;
  const reason = describeConnectionError(cause ?? error, url);
  return file ? `${file} failed: ${reason}` : reason;
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const folder = resolve(process.argv[2] ?? DEFAULT_FOLDER);

  // Every migration statement gives up a lock it cannot take within the timeout rather than queue the site behind it.
  const client = postgres(withMigrationLockTimeout(withoutClientOnlyParams(url)), {
    max: 1,
    prepare: false,
    onnotice: () => {},
  });

  try {
    await migrate(drizzle(client), { migrationsFolder: folder });
    console.log('Migrations applied.');
  } catch (error) {
    console.error(`Migration failed: ${describeMigrationFailure(error, folder, url)}`);
    process.exitCode = 1;
  } finally {
    await client.end({ timeout: 5 });
  }
}

if (import.meta.main) {
  await main();
}

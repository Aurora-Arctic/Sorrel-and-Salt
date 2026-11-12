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

/**
 * The newest recorded `created_at`, which the migrator compares each journal `when` against: later is pending. `null` when no migration is recorded or the journal table
 * does not exist yet, so all are pending; `undefined` when it cannot be read.
 */
async function newestApplied(client: postgres.Sql): Promise<number | null | undefined> {
  try {
    const [row] = await client<
      { created_at: string }[]
    >`select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1`;
    return row ? Number(row.created_at) : null;
  } catch (error) {
    return (error as { code?: string }).code === '42P01' ? null : undefined;
  }
}

/**
 * The `.sql` file holding a statement, by the journal's order, which is the order the migrator reads in. Only a migration this run had pending can have failed, and an applied one
 * may hold the same statement; when the journal cannot be read, the newest match is the likelier.
 */
async function fileOfStatement(
  client: postgres.Sql,
  folder: string,
  statement: string,
): Promise<string | undefined> {
  const journal = JSON.parse(readFileSync(join(folder, 'meta/_journal.json'), 'utf8')) as {
    entries: { tag: string }[];
  };
  const applied = await newestApplied(client);
  const candidates = readMigrationFiles({ migrationsFolder: folder })
    .map((migration, index) => ({ migration, tag: journal.entries[index].tag }))
    .filter(
      ({ migration }) =>
        applied === undefined || applied === null || migration.folderMillis > applied,
    );
  if (applied === undefined) candidates.reverse();
  const match = candidates.find(({ migration }) => migration.sql.includes(statement));
  return match ? `${match.tag}.sql` : undefined;
}

/** drizzle wraps the driver's error and carries the failed statement beside it. */
async function describeMigrationFailure(
  error: unknown,
  client: postgres.Sql,
  folder: string,
  url: string,
): Promise<string> {
  const statement = (error as { query?: unknown } | null)?.query;
  const cause = (error as { cause?: unknown } | null)?.cause;
  const file =
    typeof statement === 'string' ? await fileOfStatement(client, folder, statement) : undefined;
  const reason = describeConnectionError(cause ?? error, url);
  return file ? `${file}: ${reason}` : reason;
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
    console.error(
      `Migration failed: ${await describeMigrationFailure(error, client, folder, url)}`,
    );
    process.exitCode = 1;
  } finally {
    await client.end({ timeout: 5 });
  }
}

if (import.meta.main) {
  await main();
}

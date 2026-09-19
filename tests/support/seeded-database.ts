import { execFileSync } from 'node:child_process';
import postgres from 'postgres';

// The one place a test database is made from the migrated schema and the
// `standard` scenario; db-global-setup.ts and e2e/global-setup.ts both clone
// from what it builds. Built at test-run setup rather than baked into the
// Postgres image: claude-docs/testing.md, "Where tests live".
//
// Migrate and seed are spawned as the same two npm scripts compose's `db-init`
// runs, not imported: that is what makes local and CI run the same migrations
// and seed, and it keeps this file out of both import boundaries (nothing in
// tests/support/ may build a Drizzle handle).

/** M0.18's baked-in base: extensions only, no schema. Never written to. */
export const BASE_TEMPLATE = 'sorrel_template';

/**
 * `DATABASE_URL` with only the database swapped for `name`; no fallback, as
 * src/db/connection.ts.
 */
export function databaseUrl(name: string, base = process.env.DATABASE_URL): string {
  if (!base) throw new Error('DATABASE_URL is not set');
  const url = new URL(base);
  url.pathname = `/${name}`;
  return url.toString();
}

/**
 * A connection to `sorrel`, the one database that always exists, for the
 * CREATE/DROP DATABASE that cannot run inside the database they concern.
 * NOTICEs silenced: the drop-if-exists path emits one on every clean run.
 */
function admin() {
  return postgres(databaseUrl('sorrel'), { onnotice: () => {} });
}

/**
 * `name`, freshly cloned from `template`. An existing `name` is dropped first,
 * `WITH (FORCE)`, so a test file that never ended its pool cannot block it.
 */
export async function cloneDatabase(name: string, template: string): Promise<void> {
  const sql = admin();
  try {
    await sql.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await sql.unsafe(`CREATE DATABASE ${name} TEMPLATE ${template}`);
  } finally {
    await sql.end();
  }
}

export async function dropDatabase(name: string): Promise<void> {
  const sql = admin();
  try {
    await sql.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  } finally {
    await sql.end();
  }
}

// No `cwd`: both runners start at the repo root, and paths.ts's REPO_ROOT is
// `import.meta.dirname`, which e2e/ cannot use under Playwright's CommonJS
// transform. `Record<string, string>` rather than `NodeJS.ProcessEnv`: the
// repo's augmentation requires NODE_ENV, which a two-key bag need not carry.
function run(script: string, url: string, env: Record<string, string> = {}): void {
  try {
    execFileSync('npm', ['run', '-s', script], {
      env: { ...process.env, ...env, DATABASE_URL: url },
      stdio: 'pipe',
      encoding: 'utf8',
    });
  } catch (error) {
    // The child's output is the only trace of a failed migration.
    const { stdout, stderr } = error as { stdout?: string; stderr?: string };
    throw new Error(
      `npm run ${script} failed against ${url}\n${[stdout, stderr].filter(Boolean).join('\n')}`,
    );
  }
}

/**
 * `name` as a clone of the extensions-only base with every migration applied
 * and the `standard` scenario seeded. Around a second; clones from it are tens
 * of milliseconds. `standard` because that is the scenario the fixture cast
 * and the invented-names rule are written against; a test wanting a grimoire
 * seeds `demo` on top.
 */
export async function seedTemplate(name: string): Promise<void> {
  await cloneDatabase(name, BASE_TEMPLATE);
  const url = databaseUrl(name);
  run('db:migrate', url);
  run('db:seed', url, { SEED_SCENARIO: 'standard' });
}

/**
 * Every table in `public` emptied in one statement, for the tests that are
 * about seeding. Not `dropSchema`: that takes the schema with it.
 */
export async function truncateAllTables(sql: ReturnType<typeof postgres>): Promise<void> {
  const rows = await sql<{ tablename: string }[]>`
    select tablename from pg_tables where schemaname = 'public'
  `;
  if (rows.length === 0) return;
  const tables = rows.map((row) => `"${row.tablename}"`).join(', ');
  await sql.unsafe(`truncate ${tables} cascade`);
}

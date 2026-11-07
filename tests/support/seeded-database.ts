import { execFileSync } from 'node:child_process';
import postgres from 'postgres';

// The one place a test database is made from the migrated schema and the `standard` scenario; db-global-setup.ts
// and tests/e2e/global-setup.ts both clone from it (claude-docs/testing/where-tests-live.md, "Where tests live").
// Migrate and seed are spawned as the npm scripts compose's `db-init` runs, so local and CI run the same ones.

/** The baked-in base: extensions only, no schema. Never written to. */
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

// No `cwd`: both runners start at the repo root, and paths.ts's REPO_ROOT uses `import.meta.dirname`, which
// Playwright's CommonJS transform refuses. `Record<string, string>`: the repo's `ProcessEnv` augmentation requires NODE_ENV.
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
 * `name` as a clone of the extensions-only base with every migration applied and the `standard` scenario
 * seeded, which the fixture cast and the invented-names rule are written against. Around a second.
 * With a `key`, an existing `name` stored under the same key is left as it is, and a rebuilt one is stored
 * under it, as a comment on the database.
 */
export async function seedTemplate(
  name: string,
  { demoCoven = false, key }: { demoCoven?: boolean; key?: string } = {},
): Promise<void> {
  if (key && (await templateKey(name)) === key) return;
  await cloneDatabase(name, BASE_TEMPLATE);
  const url = databaseUrl(name);
  run('db:migrate', url);
  run('db:seed', url, { SEED_SCENARIO: 'standard' });
  // `standard` leaves the demo coven out, as production seeds it as reference data; a browser spec about it asks for it.
  if (demoCoven) run('db:seed:demo-coven', url);
  // Last, so a seed that failed part-way leaves no key and the next run reseeds.
  if (key) await setTemplateKey(name, key);
}

/** The key `seedTemplate` stored on `name`, or undefined when the database or its key is missing. */
async function templateKey(name: string): Promise<string | undefined> {
  const sql = admin();
  try {
    const [row] = await sql<{ key: string | null }[]>`
      select shobj_description(oid, 'pg_database') as key from pg_database where datname = ${name}
    `;
    return row?.key ?? undefined;
  } finally {
    await sql.end();
  }
}

async function setTemplateKey(name: string, key: string): Promise<void> {
  const sql = admin();
  try {
    // A comment takes a literal, not a parameter; `key` is a hex digest.
    if (!/^[0-9a-f]+$/.test(key)) throw new Error('A template key must be a hex digest');
    await sql.unsafe(`COMMENT ON DATABASE ${name} IS '${key}'`);
  } finally {
    await sql.end();
  }
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

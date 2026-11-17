import { execFileSync } from 'node:child_process';
import postgres from 'postgres';

// The one place a test database is made from the migrated schema and the `standard` scenario (claude-docs/testing/where-tests-live.md, "Where tests live").
// Migrate and seed run the npm scripts compose's `db-init` runs, so local and CI run the same ones.

/** The baked-in base: extensions only, no schema. Never written to. */
export const BASE_TEMPLATE = 'sorrel_template';

export function databaseUrl(name: string, base = process.env.DATABASE_URL): string {
  if (!base) throw new Error('DATABASE_URL is not set');
  const url = new URL(base);
  url.pathname = `/${name}`;
  return url.toString();
}

// `sorrel` always exists, so CREATE/DROP DATABASE run from it. NOTICEs silenced: the drop-if-exists path emits one on every clean run.
function admin() {
  return postgres(databaseUrl('sorrel'), { onnotice: () => {} });
}

// An existing `name` is dropped `WITH (FORCE)`, so a test file that never ended its pool cannot block it.
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

export async function seedTemplate(
  name: string,
  { demoCoven = false }: { demoCoven?: boolean } = {},
): Promise<void> {
  await cloneDatabase(name, BASE_TEMPLATE);
  const url = databaseUrl(name);
  run('db:migrate', url);
  run('db:seed', url, { SEED_SCENARIO: 'standard' });
  // `standard` leaves the demo coven out, as production seeds it as reference data; a browser spec about it asks for it.
  if (demoCoven) run('db:seed:demo-coven', url);
}

// Not `dropSchema`: that takes the schema with it.
export async function truncateAllTables(sql: ReturnType<typeof postgres>): Promise<void> {
  const rows = await sql<{ tablename: string }[]>`
    select tablename from pg_tables where schemaname = 'public'
  `;
  if (rows.length === 0) return;
  const tables = rows.map((row) => `"${row.tablename}"`).join(', ');
  await sql.unsafe(`truncate ${tables} cascade`);
}

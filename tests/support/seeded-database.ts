import { execFileSync } from 'node:child_process';
import postgres from 'postgres';

// M1.27 — the one place a test database is made from the migrated schema and
// the `standard` scenario. Two consumers: tests/support/db-global-setup.ts
// (one seeded template per Vitest run, cloned once per worker slot and again
// before every test file by db-setup.ts) and e2e/global-setup.ts (one seeded
// template per Playwright run, cloned into `sorrel_e2e` between spec files).
// Built here at test-run setup rather than baked into the Postgres image:
// claude-docs/design-decisions/m1.27-template-at-setup-not-in-image.md.
//
// Migrate and seed run as **the same two npm scripts docker-compose's
// `db-init` service runs** (M1.24), spawned with `DATABASE_URL` pointed at the
// template, rather than by importing the migrator and the seed here. Deliberate
// twice over: it is what makes "local and CI run the same migrations and the
// same seed" literally true, and it is how this file stays out of both import
// boundaries — nothing in tests/support/ may build a Drizzle handle (CLAUDE.md
// rule 4, MB.33), and scripts/db-seed.ts, which `db:seed` runs, is one of the
// four files that may import the client.

/** M0.18's baked-in base: extensions only, no schema. Never written to. */
export const BASE_TEMPLATE = 'sorrel_template';

/**
 * `DATABASE_URL` with its database swapped for `name`, keeping host and
 * credentials — `postgres` inside the devcontainer, `localhost` on a bare host.
 * No default and no silent fallback, matching src/db/connection.ts.
 */
export function databaseUrl(name: string, base = process.env.DATABASE_URL): string {
  if (!base) throw new Error('DATABASE_URL is not set');
  const url = new URL(base);
  url.pathname = `/${name}`;
  return url.toString();
}

/**
 * A connection to `sorrel`, the one database that always exists, for the
 * `CREATE DATABASE` / `DROP DATABASE` that cannot run inside the database they
 * concern. Ended by every caller; NOTICEs silenced because the
 * drop-if-exists path emits one on every clean run.
 */
function admin() {
  return postgres(databaseUrl('sorrel'), { onnotice: () => {} });
}

/**
 * `name`, freshly cloned from `template`. An existing `name` is dropped first,
 * `WITH (FORCE)` — a test file that never ended its pool would otherwise leave
 * a connection that blocks the drop, and the point of re-cloning before each
 * file is that no file can leave anything behind. Postgres 13+ syntax, and
 * `sorrel` may use it: the sessions it terminates are its own.
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

// No `cwd`: `npm run` resolves the nearest package.json upward from wherever
// it starts, and both runners start at the repo root. Not paths.ts's
// REPO_ROOT, deliberately — that is `import.meta.dirname`, which e2e/ (one of
// this module's two consumers) cannot use under Playwright's CommonJS
// transform of the e2e tree; this file has to load in both.
// `Record<string, string>` rather than `NodeJS.ProcessEnv`: the repo's
// augmentation of ProcessEnv requires NODE_ENV, which a two-key override bag
// has no reason to carry.
function run(script: string, url: string, env: Record<string, string> = {}): void {
  try {
    execFileSync('npm', ['run', '-s', script], {
      env: { ...process.env, ...env, DATABASE_URL: url },
      stdio: 'pipe',
      encoding: 'utf8',
    });
  } catch (error) {
    // execFileSync's error carries the child's output as buffers; a failed
    // migration is only debuggable if that output reaches the test log.
    const { stdout, stderr } = error as { stdout?: string; stderr?: string };
    throw new Error(
      `npm run ${script} failed against ${url}\n${[stdout, stderr].filter(Boolean).join('\n')}`,
    );
  }
}

/**
 * `name`, as a clone of the extensions-only base with every migration applied
 * and the `standard` scenario seeded — the template everything else clones.
 * Around a second; the clones from it are tens of milliseconds.
 *
 * `standard`, not `demo`: it is the scenario CLAUDE.md's fixture users A–E and
 * workspaces W/X come from, and M1.25's invented-names rule is written against
 * it. A test that wants a grimoire seeds `demo` on top; nothing is taken away.
 */
export async function seedTemplate(name: string): Promise<void> {
  await cloneDatabase(name, BASE_TEMPLATE);
  const url = databaseUrl(name);
  run('db:migrate', url);
  run('db:seed', url, { SEED_SCENARIO: 'standard' });
}

/**
 * Every table in `public` emptied, in one statement, foreign keys and all.
 * For the tests that are *about* seeding and so need the schema without the
 * rows the template arrives with — tests/db/seed/*. Not `dropSchema`: that is
 * `db:reset`'s tool and takes the schema with it.
 */
export async function truncateAllTables(sql: ReturnType<typeof postgres>): Promise<void> {
  const rows = await sql<{ tablename: string }[]>`
    select tablename from pg_tables where schemaname = 'public'
  `;
  if (rows.length === 0) return;
  const tables = rows.map((row) => `"${row.tablename}"`).join(', ');
  await sql.unsafe(`truncate ${tables} cascade`);
}

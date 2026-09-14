import postgres from 'postgres';
import type { TestProject } from 'vitest/node';
import { workerDatabaseName } from './worker-database';

declare module 'vitest' {
  interface ProvidedContext {
    /**
     * Every database this setup cloned, one per pool slot. Provided so a test
     * can assert the database it landed in is one that was actually made,
     * rather than recomputing the bound and agreeing with itself (MB.14).
     */
    workerDatabases: string[];
  }
}

// Same host/credentials the app itself would connect with — `localhost`
// inside the devcontainer means the devcontainer, not the `postgres`
// service, so this can't be hardcoded. No default, no silent fallback,
// matching connection.ts.
function adminUrl(): string {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('DATABASE_URL is not set');
  const url = new URL(base);
  url.pathname = '/sorrel';
  return url.toString();
}

// The drop-if-exists below hits a no-op NOTICE on every clean run (only a
// crashed prior run leaves something to actually drop) — silenced so it
// doesn't bury a real failure in CI log noise.
const connect = () => postgres(adminUrl(), { onnotice: () => {} });

// Rejected alternative — wrapping each test in a rolled-back transaction —
// and why, is recorded in claude-docs/design-decisions/m1.9-test-db-isolation.md.
export default async function setup(project: TestProject) {
  // One clone per pool slot, and `maxWorkers` is exactly what bounds a slot id
  // (`VITEST_POOL_ID`). A worker that derives some other index — as one keyed
  // off `VITEST_WORKER_ID` did until MB.14 — asks for a database this loop
  // never made.
  const databases = Array.from({ length: project.config.maxWorkers }, (_, i) =>
    workerDatabaseName(i + 1),
  );
  project.provide('workerDatabases', databases);

  const sql = connect();
  for (const database of databases) {
    await sql.unsafe(`DROP DATABASE IF EXISTS ${database}`);
    await sql.unsafe(`CREATE DATABASE ${database} TEMPLATE sorrel_template`);
  }
  await sql.end();

  return async () => {
    const sql = connect();
    for (const database of databases) {
      await sql.unsafe(`DROP DATABASE IF EXISTS ${database}`);
    }
    await sql.end();
  };
}

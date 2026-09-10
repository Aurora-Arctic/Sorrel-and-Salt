import postgres from 'postgres';
import type { TestProject } from 'vitest/node';

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
  const workers = project.config.maxWorkers;
  const sql = connect();
  for (let id = 1; id <= workers; id++) {
    await sql.unsafe(`DROP DATABASE IF EXISTS sorrel_test_${id}`);
    await sql.unsafe(`CREATE DATABASE sorrel_test_${id} TEMPLATE sorrel_template`);
  }
  await sql.end();

  return async () => {
    const sql = connect();
    for (let id = 1; id <= workers; id++) {
      await sql.unsafe(`DROP DATABASE IF EXISTS sorrel_test_${id}`);
    }
    await sql.end();
  };
}

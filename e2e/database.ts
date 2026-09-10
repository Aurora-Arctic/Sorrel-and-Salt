import postgres from 'postgres';

// Mirrors src/test/db-global-setup.ts's admin-connection pattern for
// Vitest, adapted for Playwright's single `sorrel_e2e` database rather than
// one clone per worker.
const E2E_DATABASE = 'sorrel_e2e';

function baseUrl(): URL {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL is not set');
  return new URL(value);
}

export function e2eDatabaseUrl(): string {
  const url = baseUrl();
  url.pathname = `/${E2E_DATABASE}`;
  return url.toString();
}

function adminUrl(): string {
  const url = baseUrl();
  url.pathname = '/sorrel';
  return url.toString();
}

// "Reseeding" `sorrel_e2e` means recreating it from `sorrel_template`, the
// same clone `db-global-setup.ts` does for each Vitest worker — not calling
// `src/db/seed`, which still throws for every scenario until M1.21-23, and
// `sorrel_template` itself carries no schema or seed data until M1.27 bakes
// them into the image (see docker-compose.yaml). This keeps every spec file
// starting from the same known baseline today, and needs no changes once
// the template actually carries seeded content.
export async function recreateE2eDatabase(): Promise<void> {
  const sql = postgres(adminUrl(), { onnotice: () => {} });
  await sql.unsafe(`DROP DATABASE IF EXISTS ${E2E_DATABASE}`);
  await sql.unsafe(`CREATE DATABASE ${E2E_DATABASE} TEMPLATE sorrel_template`);
  await sql.end();
}

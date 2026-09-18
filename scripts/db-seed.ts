#!/usr/bin/env node
// M1.3 wired `npm run db:seed` to the seed module's entrypoint; M1.21 gave it
// something to do. This always seeds `minimal` — scenario selection by
// environment variable is M1.24's job, alongside the Docker init hook and
// `make db-reset`.
//
// Runs through `tsx`, not bare Node like the other scripts: Node's own type
// stripping resolves no extensionless relative import, and the seed is the
// first thing under src/ a script executes that has one (M1.21).
//
// Usage: npm run db:seed

// M1.17: the seed CLI hands a client to seed(), which writes as the bootstrap
// user rather than through a session — claude-docs/db.md, "Who may import the
// client".
// oxlint-disable-next-line no-restricted-imports
import { db } from '../src/db/connection.ts';
import { seed } from '../src/db/seed/index.ts';

try {
  await seed(db, { scenario: 'minimal' });
} finally {
  // connection.ts opens a pool and never closes it — the app has no reason
  // to — so without this the process finishes its work and then never
  // exits. A thrown seed still ends the pool, and the throw still propagates
  // to a non-zero exit.
  await db.$client.end();
}

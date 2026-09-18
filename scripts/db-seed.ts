#!/usr/bin/env node
// M1.3 wired `npm run db:seed` to the seed module's entrypoint; M1.21 gave it
// something to do. With no argument this always seeds `minimal` — scenario
// selection by environment variable is M1.24's job, alongside the Docker init
// hook and `make db-reset`.
//
// `categories` (M4.3) is the one argument it takes, and it is not a scenario:
// DESIGN.md §6's category vocabulary is reference data the real site needs as
// much as a fixture does, so it seeds on its own, without the users a scenario
// would bring. It is what migrate.yml runs against staging and production,
// after applying migrations and in the same job. It lives in this script rather than one of its own because the
// import below is a database-client exemption, and that set of four is pinned
// by test (claude-docs/db.md, "Who may import the client") — a fifth is a
// decision, and "the seed needed a second entrypoint" is not one worth making.
//
// Runs through `tsx`, not bare Node like the other scripts: Node's own type
// stripping resolves no extensionless relative import, and the seed is the
// first thing under src/ a script executes that has one (M1.21).
//
// Usage: npm run db:seed
//        npm run db:seed:categories

// M1.17: the seed CLI hands a client to seed(), which writes as the bootstrap
// user rather than through a session — claude-docs/db.md, "Who may import the
// client".
// oxlint-disable-next-line no-restricted-imports
import { db } from '../src/db/connection.ts';
import { seed } from '../src/db/seed/index.ts';
import { seedCategories } from '../src/db/seed/categories.ts';

const target = process.argv[2] ?? 'scenario';

try {
  if (target === 'categories') {
    await seedCategories(db);
    console.log('Seeded DESIGN.md §6 category groups and categories.');
  } else if (target === 'scenario') {
    await seed(db, { scenario: 'minimal' });
  } else {
    throw new Error(`Unknown seed target "${target}". Pass "categories", or nothing for minimal.`);
  }
} finally {
  // connection.ts opens a pool and never closes it — the app has no reason
  // to — so without this the process finishes its work and then never
  // exits. A thrown seed still ends the pool, and the throw still propagates
  // to a non-zero exit.
  await db.$client.end();
}

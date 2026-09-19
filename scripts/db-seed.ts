#!/usr/bin/env node
// M1.3 wired `npm run db:seed` to the seed module's entrypoint; M1.21 gave it
// something to do; M1.24 made the scenario selectable and added the `drop`
// that `npm run db:reset` opens with.
//
// This is the repo's one database CLI rather than one script per verb, and
// deliberately: reaching the database from a script means importing the
// client, and that exemption set is four files pinned by test (claude-docs/
// db.md, "Who may import the client"). A fifth is a decision, and "the seed
// needed a second entrypoint" is not one worth making — so `categories`,
// `forms` and `drop` are arguments here instead of scripts of their own.
//
// `categories` (M4.3) and `forms` (M4.3a) are not scenarios: DESIGN.md §6's
// category vocabulary and §5's form vocabulary are reference data the real
// site needs as much as a fixture does, so each seeds on its own, without the
// users a scenario would bring. They are what migrate.yml runs against staging
// and production, after applying migrations and in the same job.
//
// `drop` is the only destructive verb here, and it is the one thing that makes
// `db:reset` a reset rather than a re-run — see src/db/seed/reset.ts.
//
// Runs through `tsx`, not bare Node like the other scripts: Node's own type
// stripping resolves no extensionless relative import, and the seed is the
// first thing under src/ a script executes that has one (M1.21).
//
// Usage: npm run db:seed              # SEED_SCENARIO, default minimal
//        SEED_SCENARIO=demo npm run db:seed
//        npm run db:seed:categories
//        npm run db:seed:forms
//        npm run db:drop              # drop the schema, nothing else
//        npm run db:reset             # drop, migrate, seed

// M1.17: the seed CLI hands a client to seed(), which writes as the bootstrap
// user rather than through a session — claude-docs/db.md, "Who may import the
// client".
// oxlint-disable-next-line no-restricted-imports
import { db } from '../src/db/connection.ts';
import { resolveScenario, seed } from '../src/db/seed/index.ts';
import { seedCategories } from '../src/db/seed/categories.ts';
import { seedForms } from '../src/db/seed/forms.ts';
import { dropSchema } from '../src/db/seed/reset.ts';

const target = process.argv[2] ?? 'scenario';

try {
  if (target === 'categories') {
    await seedCategories(db);
    console.log('Seeded DESIGN.md §6 category groups and categories.');
  } else if (target === 'forms') {
    await seedForms(db);
    console.log('Seeded DESIGN.md §5 ingredient form groups and forms.');
  } else if (target === 'drop') {
    // The one guard on the one destructive verb. `db:reset` is a local
    // development convenience and nothing in deploy.yml or migrate.yml calls
    // it; a production DATABASE_URL in a shell that also has this script is
    // the accident worth refusing outright rather than confirming.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Refusing to drop the schema with NODE_ENV=production.');
    }
    await dropSchema(db);
    console.log('Dropped the public and drizzle schemas. Run db:migrate to rebuild.');
  } else if (target === 'scenario') {
    // Unset means `minimal`; a name that is not a scenario throws rather than
    // falling back to it (src/db/seed/index.ts).
    const scenario = resolveScenario(process.env.SEED_SCENARIO);
    await seed(db, { scenario });
    console.log(`Seeded the ${scenario} scenario.`);
  } else {
    throw new Error(
      `Unknown seed target "${target}". Pass "categories", "forms" or "drop", or nothing to seed a scenario.`,
    );
  }
} finally {
  // connection.ts opens a pool and never closes it — the app has no reason
  // to — so without this the process finishes its work and then never
  // exits. A thrown seed still ends the pool, and the throw still propagates
  // to a non-zero exit.
  await db.$client.end();
}

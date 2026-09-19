#!/usr/bin/env node
// The repo's one database CLI rather than one script per verb: reaching the
// database from a script means importing the client, and that exemption set is
// four files pinned by test (claude-docs/db.md, "Who may import the client").
// So `categories`, `forms` and `drop` are arguments here rather than scripts of
// their own.
//
// `categories` and `forms` are not scenarios — DESIGN.md §6's and §5's
// vocabularies are reference data the real site needs, so each seeds on its
// own, without the users a scenario would bring. They are what migrate.yml runs
// against staging and production after applying migrations.
//
// Runs through `tsx`, not bare Node like the other scripts: Node's own type
// stripping resolves no extensionless relative import, and the seed is the
// first thing under src/ a script executes that has one.
//
// Usage: npm run db:seed              # SEED_SCENARIO, default minimal
//        SEED_SCENARIO=demo npm run db:seed
//        npm run db:seed:categories
//        npm run db:seed:forms
//        npm run db:drop              # drop the schema, nothing else
//        npm run db:reset             # drop, migrate, seed

// The CLI hands a client to seed(), which writes as the bootstrap user rather
// than through a session — one of the four exemptions above.
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
    // The one guard on the one destructive verb. Nothing in deploy.yml or
    // migrate.yml calls it, so a production DATABASE_URL in a shell that also
    // has this script is an accident worth refusing rather than confirming.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Refusing to drop the schema with NODE_ENV=production.');
    }
    await dropSchema(db);
    console.log('Dropped the public and drizzle schemas. Run db:migrate to rebuild.');
  } else if (target === 'scenario') {
    // Unset means `minimal`; an unrecognised name throws rather than falling
    // back to it (src/db/seed/index.ts).
    const scenario = resolveScenario(process.env.SEED_SCENARIO);
    await seed(db, { scenario });
    console.log(`Seeded the ${scenario} scenario.`);
  } else {
    throw new Error(
      `Unknown seed target "${target}". Pass "categories", "forms" or "drop", or nothing to seed a scenario.`,
    );
  }
} finally {
  // connection.ts opens a pool and never closes it — the app has no reason to —
  // so without this the process finishes its work and never exits. A thrown
  // seed still ends the pool, and still exits non-zero.
  await db.$client.end();
}

#!/usr/bin/env node
// The repo's one database CLI: reaching the database means importing the
// client, and that exemption set is four files pinned by test (claude-docs/db.md,
// "Who may import the client"). `categories` and `forms` are reference data,
// not scenarios — what migrate.yml seeds after migrating. Runs through `tsx`:
// Node's own type stripping resolves no extensionless relative import.
//
// Usage: npm run db:seed              # SEED_SCENARIO, default minimal
//        npm run db:seed:categories | db:seed:forms
//        npm run db:drop              # drop the schema, nothing else
//        npm run db:reset             # drop, migrate, seed

// Hands a client to seed(), which writes as the bootstrap user rather than
// through a session.
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
    // The one guard on the one destructive verb: nothing in CI calls it, so a
    // production URL in a local shell is refused rather than confirmed.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Refusing to drop the schema with NODE_ENV=production.');
    }
    await dropSchema(db);
    console.log('Dropped the public and drizzle schemas. Run db:migrate to rebuild.');
  } else if (target === 'scenario') {
    const scenario = resolveScenario(process.env.SEED_SCENARIO);
    await seed(db, { scenario });
    console.log(`Seeded the ${scenario} scenario.`);
  } else {
    throw new Error(
      `Unknown seed target "${target}". Pass "categories", "forms" or "drop", or nothing to seed a scenario.`,
    );
  }
} finally {
  // connection.ts opens a pool it never closes, so without this the process
  // never exits; a thrown seed still exits non-zero.
  await db.$client.end();
}

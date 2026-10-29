#!/usr/bin/env node
// The repo's one database CLI: reaching the database means importing the
// client, and that exemption set is six files pinned by test (claude-docs/db/client-imports.md,
// "Who may import the client"). `categories`, `forms`, `astrology`, `deities`,
// `sources` and `compendium` are reference data, not scenarios — what migrate.yml seeds after migrating. Runs through `tsx`:
// Node's own type stripping resolves no extensionless relative import.
//
// Usage: npm run db:seed              # SEED_SCENARIO, default minimal
//        npm run db:seed:categories | db:seed:forms | db:seed:astrology | db:seed:deities
//        npm run db:seed:sources      # after the vocabularies it links
//        npm run db:seed:compendium   # after the vocabularies and sources
//        npm run db:seed:<reference target> -- --dry-run    # run, then roll back: write nothing
//        npm run db:seed:compendium -- [--dry-run] [--adopt] [--force]
//          --adopt also lists the ADOPTED lines, as migrate.yml does
//          --force lifts refusals 1 to 4
//        npm run db:seed:reference -- [--dry-run] [--adopt] [--force]
//          all six above in one transaction, which a dry run rolls back once
//        npm run db:drop              # drop the schema, nothing else
//        npm run db:reset             # drop, migrate, seed

// Hands a client to seed(), which writes as the bootstrap user rather than
// through a session.
// oxlint-disable-next-line no-restricted-imports
import { db } from '../src/db/connection.ts';
import { resolveScenario, seed } from '../src/db/seed/index.ts';
import { seedCategories } from '../src/db/seed/categories.ts';
import { seedAstrology } from '../src/db/seed/astrology.ts';
import { seedForms } from '../src/db/seed/forms.ts';
import { seedDeities } from '../src/db/seed/deities.ts';
import { seedSources } from '../src/db/seed/sources.ts';
import { seedCompendium } from '../src/db/seed/compendium.ts';
import { seedReferenceData } from '../src/db/seed/reference-data.ts';
import { formatReport, hasRefusals } from '../src/db/seed/compendium/report.ts';
import { dropSchema } from '../src/db/seed/reset.ts';

const target = process.argv[2] ?? 'scenario';
const flags = new Set(process.argv.slice(3));

// The flags each target takes: every reference seed has a dry run,
// and only the compendium reports adoptions or can be forced.
const FLAGS: Record<string, readonly string[]> = {
  categories: ['--dry-run'],
  forms: ['--dry-run'],
  astrology: ['--dry-run'],
  deities: ['--dry-run'],
  sources: ['--dry-run'],
  compendium: ['--dry-run', '--adopt', '--force'],
  reference: ['--dry-run', '--adopt', '--force'],
};
const allowed = FLAGS[target] ?? [];
for (const flag of flags) {
  if (!allowed.includes(flag)) {
    throw new Error(
      `Unknown flag "${flag}" for "${target}": it takes ${allowed.length > 0 ? allowed.join(', ') : 'no flags'}.`,
    );
  }
}
const dryRun = flags.has('--dry-run');

/** The line a reference seed ends on: what it seeded, or that a dry run wrote nothing. */
const done = (what: string): void => {
  console.log(
    dryRun ? `Dry run: ${what} were seeded and rolled back; nothing written.` : `Seeded ${what}.`,
  );
};

try {
  if (target === 'categories') {
    await seedCategories(db, { dryRun });
    done('DESIGN.md §6 category groups and categories');
  } else if (target === 'forms') {
    await seedForms(db, { dryRun });
    done('DESIGN.md §5 ingredient form groups and forms');
  } else if (target === 'astrology') {
    await seedAstrology(db, { dryRun });
    done('DESIGN.md §5 planet and zodiac vocabularies');
  } else if (target === 'deities') {
    await seedDeities(db, { dryRun });
    done('the deity traditions and deities');
  } else if (target === 'sources') {
    await seedSources(db, { dryRun });
    done("the vocabularies' sources and their links");
  } else if (target === 'compendium' || target === 'reference') {
    // One line per entry the run updated, refused, left pending or
    // found retired, then the totals; a refused entry exits 1, which fails
    // the deploy's seed step so the refusal is read, not buried. `reference`
    // runs the five vocabulary seeds first, in the same transaction.
    const force = flags.has('--force');
    const report =
      target === 'reference'
        ? await seedReferenceData(db, { dryRun, force })
        : await seedCompendium(db, undefined, { dryRun, force });
    console.log(formatReport(report, { adopt: flags.has('--adopt') }));
    if (hasRefusals(report)) process.exitCode = 1;
    if (force) console.log('Forced: refusals 1 to 4 were lifted for every marked entry.');
    const what =
      target === 'reference'
        ? 'the five vocabularies, their sources and the compendium'
        : 'the compendium: its entries, their forms and their sources';
    console.log(
      dryRun ? `Dry run: decided ${what}, then rolled back; nothing written.` : `Seeded ${what}.`,
    );
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
      `Unknown seed target "${target}". Pass "categories", "forms", "astrology", "deities", "sources", "compendium", "reference" or "drop", or nothing to seed a scenario.`,
    );
  }
} finally {
  // connection.ts opens a pool it never closes, so without this the process
  // never exits; a thrown seed still exits non-zero.
  await db.$client.end();
}

import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { fromRoot } from '../../support/paths';
import { seedAstrology } from '@/db/seed/astrology';
import { seedCategories } from '@/db/seed/categories';
import { seedCompendium } from '@/db/seed/compendium';
import { seedDeities } from '@/db/seed/deities';
import { seedForms } from '@/db/seed/forms';
import { seedSources } from '@/db/seed/sources';
import { citationText } from '@/lib/citation';
import type { SeedCompendiumShard } from '@/db/seed/types';
import { TESTWORT, fileOf, loadedOf } from './compendium/files-fixture';

// A source stored under a citation's old wording is not found by the seed, which then reads its entry as changed. This proves the
// seed skips an approved, unmarked entry once the migration that rewrites the keys has run (`0095`), and reports it pending before.
// Retired with the migration's own test once `0095` is in production's journal.

const MIGRATION = fromRoot('src/db/migrations/0095_rekey-citation-seed-keys.sql');
const STATEMENTS = readFileSync(MIGRATION, 'utf8')
  .split('--> statement-breakpoint')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

const ENTRY_SOURCE: SeedCompendiumShard['sources'] = {
  'fixture-encyclopaedia': {
    kind: 'entry',
    title: 'Testwort',
    container: 'Fixture Encyclopaedia',
    url: 'https://example.org/testwort',
    accessed: '2026-10-11',
  },
};
const NEW_KEY = citationText(ENTRY_SOURCE['fixture-encyclopaedia']);
const OLD_KEY = NEW_KEY.replace(', under "', ', s.v. "');

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);
  await truncateAllTables(sql);
  await seedCategories(db);
  await seedForms(db);
  await seedAstrology(db);
  await seedDeities(db);
  await seedSources(db);
});

afterAll(async () => {
  await sql.end();
});

/** Testwort, citing the reference-work entry beside what it already cites. */
const files = () => [
  fileOf(TESTWORT, ({ entry }) => {
    entry.references.push({
      source: 'fixture-encyclopaedia',
      locator: 'p. 9',
      nameBasis: 'stated',
      supports: ['description'],
    });
  }),
];

const run = () => seedCompendium(db, loadedOf(files(), ENTRY_SOURCE), { manifest: null });

describe('a source stored under the old citation wording', () => {
  it('is skipped, not pending, once the migration has rewritten its key', async () => {
    await run();
    // The row as the seed wrote it before the wording changed.
    await sql`update "references" set seed_key = ${OLD_KEY} where seed_key = ${NEW_KEY}`;

    const before = await run();
    expect(before.pending).toHaveLength(1);
    expect(before.pending[0].differs).toEqual(['references']);

    // That run inserted the twin beside the old row, as the deploy did; the migration merges the two.
    for (const statement of STATEMENTS) await sql.unsafe(statement);

    const after = await run();
    expect(after.pending).toEqual([]);
    expect(after.skipped).toBe(1);
    const live = await sql`
      select seed_key from "references" where seed_key in (${NEW_KEY}, ${OLD_KEY}) and deleted_at is null`;
    expect(live).toEqual([{ seed_key: NEW_KEY }]);
  });
});

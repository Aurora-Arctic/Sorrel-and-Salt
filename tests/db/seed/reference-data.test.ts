import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { seedDeities } from '@/db/seed/deities';
import { seedSources } from '@/db/seed/sources';
import { seedReferenceData } from '@/db/seed/reference-data';
import { entryFilePath } from '@/db/seed/compendium/parse-entry';
import { REASONS } from '@/db/seed/compendium/update';
import { identityOf } from '@/db/seed/standard';
import { wordsOf } from './compendium-fixture';
import {
  SAMPLEWORT,
  TESTWORT,
  fileOf,
  fixtureFiles,
  loadedOf,
  parsed,
} from './compendium/files-fixture';

// M14.26: the six reference seeds in one transaction, which a dry run rolls
// back once. Each seed's own shape (stamps, idempotence, nothing resurrected,
// a dry run writing nothing) is index.test.ts's; force's per-refusal cases are
// compendium.test.ts's. This file proves only what running them together adds,
// over the two-entry fixture: the real files' content is reviewed, not tested.

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

/** Every row of every table, as text. */
async function snapshot(): Promise<Record<string, string[]>> {
  const tables = (
    await sql<{ tablename: string }[]>`
      select tablename from pg_tables where schemaname = 'public' order by tablename
    `
  ).map((row) => row.tablename);
  const rows: Record<string, string[]> = {};
  for (const table of tables) {
    const found = await sql.unsafe<{ row: string }[]>(
      `select to_jsonb(t)::text as row from "${table}" t`,
    );
    rows[table] = found.map((r) => r.row).sort();
  }
  return rows;
}

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);
});

afterAll(async () => {
  await sql.end();
});

beforeEach(async () => {
  await truncateAllTables(sql);
});

describe('seedReferenceData', () => {
  it('dry-runs all six seeds on an empty database, where seeds dry-run apart stop, and writes nothing', async () => {
    // Precondition: apart, the deity seed's dry run rolls its traditions back,
    // so the sources seed's dry run finds none of them and stops.
    await seedDeities(db, { dryRun: true });
    await expect(seedSources(db, { dryRun: true })).rejects.toThrow(/which no seed wrote/);
    const before = await snapshot();
    expect(before.deity_traditions, 'the database starts empty').toEqual([]);

    const report = await seedReferenceData(db, {
      compendium: fixtureFiles(),
      manifest: null,
      dryRun: true,
    });

    // The compendium was decided against the vocabularies the same run wrote.
    expect(report.inserted).toBeGreaterThan(0);
    expect(report.refused).toEqual([]);
    expect(await snapshot()).toEqual(before);
  });

  it('writes all six on a real run', async () => {
    const report = await seedReferenceData(db, { compendium: fixtureFiles(), manifest: null });

    expect(report.inserted).toBeGreaterThan(0);
    for (const table of [
      'category_groups',
      'ingredient_forms',
      'zodiac_signs',
      'deities',
      'deity_other_names',
    ]) {
      const [{ count }] = await sql.unsafe<{ count: string }[]>(`select count(*) from "${table}"`);
      expect(Number(count), table).toBeGreaterThan(0);
    }
    const [{ count }] = await sql<{ count: string }[]>`
      select count(*) from ingredients where workspace_id is null`;
    expect(Number(count)).toBe(report.inserted);
  });

  it('passes --force to the compendium seed, and only to it', async () => {
    const baseline = [fileOf(TESTWORT), fileOf(SAMPLEWORT)];
    await seedReferenceData(db, { compendium: loadedOf(baseline), manifest: null });
    await sql`update ingredients set curator_reviewed_at = now(), curator_reviewed_by = ${BOOTSTRAP_USER_ID}
      where seed_key = ${identityOf(TESTWORT)}`;
    const edit = fileOf(TESTWORT, (draft) => {
      draft.entry.description = wordsOf(121);
    });
    edit.seedUpdate = parsed(edit).hash;
    const compendium = loadedOf([edit, fileOf(SAMPLEWORT)]);

    // Precondition: unforced, the reviewed entry is refused.
    const refused = await seedReferenceData(db, { compendium, manifest: null });
    expect(refused.refused).toMatchObject([
      { where: entryFilePath(TESTWORT), reason: REASONS.reviewed },
    ]);

    const forced = await seedReferenceData(db, { compendium, manifest: null, force: true });

    expect(forced.refused).toEqual([]);
    expect(forced.updated).toEqual([entryFilePath(TESTWORT)]);
    const [row] = await sql<{ description: string; curator_reviewed_at: Date | null }[]>`
      select description, curator_reviewed_at from ingredients where seed_key = ${identityOf(TESTWORT)}`;
    expect(row).toEqual({ description: wordsOf(121), curator_reviewed_at: null });
  });
});

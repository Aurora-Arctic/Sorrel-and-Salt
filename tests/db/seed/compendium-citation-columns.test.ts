import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { seedAstrology } from '@/db/seed/astrology';
import { seedCategories } from '@/db/seed/categories';
import { seedCompendium } from '@/db/seed/compendium';
import { WORKS } from '@/db/seed/compendium/works';
import { seedDeities } from '@/db/seed/deities';
import { seedForms } from '@/db/seed/forms';
import { seedSources } from '@/db/seed/sources';
import { citationText } from '@/lib/citation';
import type { RenderableEntryFile } from '@/db/seed/compendium/render-entry';
import { TESTWORT, fileOf, loadedOf, parsed } from './compendium/files-fixture';

// A file citation's `nameBasis` and `supports` land on its link, on the entry and on a form, and a work the seed knows as
// scholarly lands with its mark. A present link written before the columns gains them in place when its file is marked.

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);
});

afterAll(async () => {
  await sql.end();
});

async function freshDatabase(): Promise<void> {
  await truncateAllTables(sql);
  await seedCategories(db);
  await seedForms(db);
  await seedAstrology(db);
  await seedDeities(db);
  await seedSources(db);
}

/** Testwort, citing a scholarly work and a trade one beside its fixture sources. */
const testwort = (): RenderableEntryFile =>
  fileOf(TESTWORT, ({ entry }) => {
    entry.references.push(
      {
        source: 'ahpa-safety',
        locator: 'p. 7',
        nameBasis: 'resolved',
        headedAs: 'Testwort',
        resolvedBy: 'cunningham-herbs',
        supports: ['safetyNotes', 'toxic'],
      },
      { source: 'cunningham-herbs', locator: 'p. 8', nameBasis: 'stated', supports: ['deities'] },
    );
  });

const run = (file: RenderableEntryFile) => seedCompendium(db, loadedOf([file]), { manifest: null });

interface LinkRow {
  id: string;
  seed_key: string;
  locator: string | null;
  form: string | null;
  name_basis: string | null;
  supports: string[] | null;
}

const links = () => sql<LinkRow[]>`
  select l.id, r.seed_key, l.locator, v.form, l.name_basis, l.supports
    from reference_links l
    join "references" r on r.id = l.reference_id
    left join ingredient_variants v on v.id = l.ingredient_variant_id
   where l.deleted_at is null`;

describe('a seeded citation', () => {
  beforeAll(async () => {
    await freshDatabase();
    await run(testwort());
  });

  it('writes its name basis and the fields it supports on the entry link', async () => {
    const rows = await links();
    const herbal = rows.find((row) => row.locator === 'p. 12' && row.form === null);
    expect(herbal?.name_basis).toBe('stated');
    expect(herbal?.supports).toEqual(TESTWORT.references[0].supports);
    const safety = rows.find((row) => row.locator === 'p. 7');
    expect(safety?.name_basis).toBe('resolved');
    expect(safety?.supports).toEqual(['safetyNotes', 'toxic']);
  });

  it('writes them on a form link', async () => {
    const oil = (await links()).find((row) => row.form === 'Oil');
    expect(oil?.name_basis).toBe('stated');
    expect(oil?.supports).toEqual(['form', 'description', 'safetyNotes', 'toxic', 'categories']);
  });

  it('marks a scholarly work and leaves a trade work unmarked', async () => {
    const rows = await sql<{ seed_key: string; scholarly: boolean }[]>`
      select seed_key, scholarly from "references"
       where seed_key in (${citationText(WORKS['ahpa-safety'])}, ${citationText(WORKS['cunningham-herbs'])})`;
    expect(Object.fromEntries(rows.map((row) => [row.seed_key, row.scholarly]))).toEqual({
      [citationText(WORKS['ahpa-safety'])]: true,
      [citationText(WORKS['cunningham-herbs'])]: false,
    });
  });
});

describe('a present link written before the columns', () => {
  beforeAll(async () => {
    await freshDatabase();
    await run(testwort());
    // The links as a run before the columns left them.
    await sql`update reference_links set name_basis = null, supports = null`;
  });

  it('is pending while its file is unmarked', async () => {
    const report = await run(testwort());
    expect(report.pending.map((entry) => entry.differs)).toEqual([['references']]);
    expect((await links()).every((row) => row.name_basis === null)).toBe(true);
  });

  it('gains both in place once its file is marked', async () => {
    const before = await links();
    const marked = testwort();
    marked.seedUpdate = parsed(marked).hash;
    const report = await run(marked);
    expect(report.pending).toEqual([]);

    const after = await links();
    expect(after.map((row) => row.id).sort()).toEqual(before.map((row) => row.id).sort());
    expect(after.find((row) => row.locator === 'p. 7')).toMatchObject({
      name_basis: 'resolved',
      supports: ['safetyNotes', 'toxic'],
    });
    expect(after.find((row) => row.form === 'Oil')?.name_basis).toBe('stated');

    // Applied, the file now matches its rows, and the next run skips it.
    const again = await run(marked);
    expect(again.skipped).toBe(1);
  });
});

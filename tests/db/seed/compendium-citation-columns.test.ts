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
import { FIXTURE_USERS } from '@/db/seed/standard';
import { hasRefusals } from '@/db/seed/compendium/report';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { identityOf } from '@/db/seed/coven-content';
import { asTouch } from '../../support/db/touch-row';
import { citationText } from '@/lib/citation';
import type { RenderableEntryFile } from '@/db/seed/compendium/render-entry';
import { TESTWORT, fileOf, loadedOf, parsed } from './compendium/files-fixture';

// A file citation's `nameBasis` and `supports` land on its link, on the entry and on a form, and a work the seed knows as
// scholarly lands with its mark. On a present entry they are provenance, not content: each link and source the seed wrote and no
// person edited takes the file's values with no mark, whatever was done to the entry; one a person edited is kept and reported.

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

const A_ID = FIXTURE_USERS.A.id;

interface EntryRow {
  seed_content_hash: string | null;
  updated_by: string;
  updated_at: Date;
  curator_reviewed_at: Date | null;
}

const entryRow = async () =>
  (
    await sql<EntryRow[]>`
      select seed_content_hash, updated_by, updated_at, curator_reviewed_at
        from ingredients where seed_key = ${identityOf(TESTWORT)}`
  )[0];

/** Testwort seeded, then every link's two attributes cleared as a run before the columns left them, by the seed's own user. */
async function seededWithBareLinks(): Promise<void> {
  await freshDatabase();
  await run(testwort());
  await sql`
    insert into users (id, name, email, created_by, updated_by)
    values (${A_ID}, 'Fixture Person A', ${`${A_ID}@users.test`}, ${A_ID}, ${A_ID})`;
  await sql`update reference_links set name_basis = null, supports = null`;
  const rows = await sql<{ updated_by: string; name_basis: string | null }[]>`
    select updated_by, name_basis from reference_links where deleted_at is null`;
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.every((row) => row.updated_by === BOOTSTRAP_USER_ID && row.name_basis === null)).toBe(
    true,
  );
}

describe('a present entry whose links differ from its file only in the two attributes', () => {
  beforeAll(seededWithBareLinks);

  it('writes them on every link with no mark, and writes nothing else', async () => {
    const file = testwort();
    // The precondition: the file is unmarked and the row's hash is the file's, which before this rule left the entry pending.
    expect(file.seedUpdate).toBeUndefined();
    const before = await entryRow();
    expect(before.seed_content_hash).toBe(parsed(file).hash);
    const ids = (await links()).map((row) => row.id).sort();

    const report = await run(file);
    expect(report.pending).toEqual([]);
    expect(report.updated).toEqual([]);
    expect(report.skipped).toBe(1);

    const after = await links();
    expect(after.map((row) => row.id).sort()).toEqual(ids);
    expect(after.find((row) => row.locator === 'p. 7')).toMatchObject({
      name_basis: 'resolved',
      supports: ['safetyNotes', 'toxic'],
    });
    expect(after.find((row) => row.form === 'Oil')?.name_basis).toBe('stated');
    expect(await entryRow()).toEqual(before);
  });
});

describe('a curator-reviewed entry with a link the seed wrote', () => {
  beforeAll(async () => {
    await seededWithBareLinks();
    await sql`update ingredients set curator_reviewed_at = now(), curator_reviewed_by = ${BOOTSTRAP_USER_ID}
      where seed_key = ${identityOf(TESTWORT)}`;
  });

  it('writes the link and keeps the review mark', async () => {
    const reviewed = (await entryRow()).curator_reviewed_at;
    // The precondition: the entry is reviewed, which the entry-wide check reads as a person's work.
    expect(reviewed).not.toBeNull();

    const report = await run(testwort());
    expect(hasRefusals(report)).toBe(false);
    expect((await links()).find((row) => row.locator === 'p. 7')?.name_basis).toBe('resolved');
    expect((await entryRow()).curator_reviewed_at).toEqual(reviewed);
  });
});

describe('a link a person edited', () => {
  beforeAll(async () => {
    await seededWithBareLinks();
    await asTouch(
      sql,
      (tx) => tx`update reference_links set updated_by = ${A_ID} where locator = 'p. 7'`,
    );
  });

  it('is left alone and reported, while the run neither refuses nor stops the seed’s own links', async () => {
    const edited = (await links()).find((row) => row.locator === 'p. 7');
    // The precondition: the person's link differs from the file, so only the per-link check keeps it.
    expect(edited?.name_basis).toBeNull();

    const report = await run(testwort());
    expect(hasRefusals(report)).toBe(false);
    expect(report.kept).toEqual([
      { where: parsed(testwort()).path, source: 'ahpa-safety', differs: ['nameBasis', 'supports'] },
    ]);
    const after = await links();
    expect(after.find((row) => row.locator === 'p. 7')).toMatchObject({
      name_basis: null,
      supports: null,
    });
    expect(after.find((row) => row.locator === 'p. 8')?.name_basis).toBe('stated');
  });
});

describe('a present source whose scholarly mark differs from the works list', () => {
  const ahpa = citationText(WORKS['ahpa-safety']);
  const cunningham = citationText(WORKS['cunningham-herbs']);
  const scholarly = async () =>
    Object.fromEntries(
      (
        await sql<{ seed_key: string; scholarly: boolean }[]>`
          select seed_key, scholarly from "references" where seed_key in (${ahpa}, ${cunningham})`
      ).map((row) => [row.seed_key, row.scholarly]),
    );

  beforeAll(async () => {
    await seededWithBareLinks();
    // The precondition: the works list marks AHPA scholarly and Cunningham not, and both rows now say the opposite.
    expect(WORKS['ahpa-safety'].scholarly).toBe(true);
    expect('scholarly' in WORKS['cunningham-herbs']).toBe(false);
    await sql`update "references" set scholarly = (seed_key = ${cunningham}) where seed_key in (${ahpa}, ${cunningham})`;
    expect(await scholarly()).toEqual({ [ahpa]: false, [cunningham]: true });
  });

  it('takes the list’s mark either way on a row no person edited', async () => {
    await run(testwort());
    expect(await scholarly()).toEqual({ [ahpa]: true, [cunningham]: false });
  });

  it('keeps a person’s edit and reports it, without refusing', async () => {
    await asTouch(
      sql,
      (tx) =>
        tx`update "references" set scholarly = false, updated_by = ${A_ID} where seed_key = ${ahpa}`,
    );
    const report = await run(testwort());
    expect(hasRefusals(report)).toBe(false);
    expect(report.kept).toContainEqual({
      where: null,
      source: 'ahpa-safety',
      differs: ['scholarly'],
    });
    expect((await scholarly())[ahpa]).toBe(false);
  });
});

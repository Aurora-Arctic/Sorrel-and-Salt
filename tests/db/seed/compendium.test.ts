import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { asTouch } from '../../support/db/touch-row';
import { insertStock } from '../../support/db/insert-stock';
import { liveFolkNames } from '../../support/db/folk-names';
import { variantIdOf, variantRowsOf } from '../../support/db/read-variants';
import { fromRoot } from '../../support/paths';
import { makeWorkspace, workspaceColumns } from '../../support/fixtures';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { seed } from '@/db/seed/index';
import { seedAstrology } from '@/db/seed/astrology';
import { seedCategories } from '@/db/seed/categories';
import {
  seedCompendium,
  seedCompendiumContent,
  type SeedCompendiumOptions,
} from '@/db/seed/compendium';
import { loadCompendium } from '@/db/seed/compendium/load';
import { entryFilePath } from '@/db/seed/compendium/parse-entry';
import { emptyReport, hasRefusals } from '@/db/seed/compendium/report';
import type { RenderableEntryFile } from '@/db/seed/compendium/render-entry';
import { REASONS } from '@/db/seed/compendium/update';
import { beginSeedTransaction } from '@/db/seed/idempotent';
import { seedDeities } from '@/db/seed/deities';
import { seedForms } from '@/db/seed/forms';
import { SOURCES, seedSources } from '@/db/seed/sources';
import { FIXTURE_USERS, identityOf } from '@/db/seed/standard';
import { citationText } from '@/lib/citation';
import { wordsOf } from './compendium-fixture';
import {
  FILE_SOURCES,
  SAMPLEWORT,
  TESTWORT,
  fileOf,
  fixtureFiles,
  loadedOf,
  parsed,
} from './compendium/files-fixture';
import type { SeedCompendiumEntry } from '@/db/seed/types';

// MB.242: the compendium seed writes each entry whole, once, on the invented
// fixture entries, read from files, against the real tables emptied first. The shape every seed
// shares — stamps, a second run a no-op, nothing resurrected — is
// index.test.ts's; the guard's rules are compendium/guard.test.ts's and
// compendium/guard-files.test.ts's.
//
// The five vocabularies the compendium picks from are seeded once for the
// file, and each case empties only what the compendium and its cases write
// (M14.27): re-seeding them per case cost most of the file's time. The cases
// that need other vocabularies, or none, have describes of their own that
// put the shared state back when they finish.

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);
});

afterAll(async () => {
  await sql.end();
});

/** What `migrate.yml` runs before the compendium. */
async function seedVocabularies(): Promise<void> {
  await seedCategories(db);
  await seedForms(db);
  await seedAstrology(db);
  await seedDeities(db);
  await seedSources(db);
}

/** The tables the five vocabularies fill, which no case below writes to. */
const VOCABULARY_TABLES = new Set([
  'category_groups',
  'categories',
  'ingredient_form_groups',
  'ingredient_forms',
  'celestial_bodies',
  'zodiac_signs',
  'deity_traditions',
  'deities',
  'deity_other_names',
]);

/** Every other table, each after every table that references it. */
let deleteOrder: string[];
/** The sources seed's own rows in the two tables the compendium also writes. */
let vocabularyRows: { references: string[]; referenceLinks: string[] };

/** Empties every table, then seeds the five vocabularies the compendium picks from. */
async function seedSharedVocabularies(): Promise<void> {
  await truncateAllTables(sql);
  await seedVocabularies();
  vocabularyRows = {
    references: (await sql<{ id: string }[]>`select id from "references"`).map((r) => r.id),
    referenceLinks: (await sql<{ id: string }[]>`select id from reference_links`).map((r) => r.id),
  };
}

/**
 * Deletes what the last case wrote and leaves the vocabularies: the bootstrap
 * user, and the sources seed's references and links, stay. A delete rather
 * than a truncate, because `truncate ... cascade` empties every referencing
 * table whole, and `reference_links` holds both seeds' rows.
 */
async function resetToVocabularies(): Promise<void> {
  for (const table of deleteOrder) {
    if (table === 'users') await sql`delete from users where id <> ${BOOTSTRAP_USER_ID}`;
    else if (table === 'references')
      await sql`delete from "references" where id <> all(${vocabularyRows.references}::uuid[])`;
    else if (table === 'reference_links')
      await sql`delete from reference_links where id <> all(${vocabularyRows.referenceLinks}::uuid[])`;
    else await sql.unsafe(`delete from "${table}"`);
  }
}

/** The non-vocabulary tables, ordered so no delete is refused by a foreign key. */
async function tablesInDeleteOrder(): Promise<string[]> {
  const tables = (
    await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public'`
  )
    .map((row) => row.tablename)
    .filter((table) => !VOCABULARY_TABLES.has(table));
  const edges = await sql<{ child: string; parent: string }[]>`
    select child.relname as child, parent.relname as parent from pg_constraint c
    join pg_class child on child.oid = c.conrelid
    join pg_class parent on parent.oid = c.confrelid
    where c.contype = 'f' and c.connamespace = 'public'::regnamespace and c.conrelid <> c.confrelid
  `;
  const ordered: string[] = [];
  const left = new Set(tables);
  while (left.size > 0) {
    // A table may go once nothing still to be emptied references it.
    const ready = [...left].filter(
      (table) => !edges.some((edge) => edge.parent === table && left.has(edge.child)),
    );
    if (ready.length === 0) throw new Error(`a foreign-key cycle among ${[...left].join(', ')}`);
    for (const table of ready) {
      ordered.push(table);
      left.delete(table);
    }
  }
  return ordered;
}

async function countOf(table: string, where = ''): Promise<number> {
  const [{ count }] = await sql.unsafe<{ count: string }[]>(
    `select count(*) from "${table}" ${where}`,
  );
  return Number(count);
}

/** Every row of the compendium's tables, as text, so a run's writes show as a diff. */
async function compendiumRows(): Promise<string[]> {
  const rows = await sql<{ row: string }[]>`
    select to_jsonb(t)::text as row from ingredients t
    union all select to_jsonb(t)::text from ingredient_variants t
    union all select to_jsonb(t)::text from ingredient_folk_names t
    union all select to_jsonb(t)::text from ingredient_deities t
    union all select to_jsonb(t)::text from ingredient_categories t
    union all select to_jsonb(t)::text from ingredient_substitutes t
    union all select to_jsonb(t)::text from "references" t
    union all select to_jsonb(t)::text from reference_links t
  `;
  return rows.map((r) => r.row).sort();
}

async function ingredientId(seedKey: string): Promise<string> {
  const [row] = await sql<{ id: string }[]>`select id from ingredients where seed_key = ${seedKey}`;
  return row.id;
}

/** An admin's own compendium entry, which no seed wrote. */
async function insertAdminEntry(name: string, canonicalName: string): Promise<void> {
  await sql`
    insert into ingredients (name, slug, canonical_name, nomenclature, created_by, updated_by)
    values (${name}, ${`${name} ${canonicalName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')},
            ${canonicalName}, 'botanical', ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
  `;
}

beforeAll(async () => {
  deleteOrder = await tablesInDeleteOrder();
  await seedSharedVocabularies();
});

beforeEach(async () => {
  await resetToVocabularies();
});

describe('seedCompendium', () => {
  describe('on an empty compendium', () => {
    beforeEach(async () => {
      await seedCompendium(db, fixtureFiles());
    });

    it('writes each entry keyed by its identity, with its forms picked from the curated rows', async () => {
      const entries = await sql<{ seed_key: string; slug: string; workspace_id: null }[]>`
        select seed_key, slug, workspace_id from ingredients order by seed_key
      `;
      expect(entries).toEqual([
        {
          seed_key: 'fixtura exemplaris',
          slug: 'samplewort-fixtura-exemplaris',
          workspace_id: null,
        },
        { seed_key: 'fixtura testalis', slug: 'testwort-fixtura-testalis', workspace_id: null },
      ]);

      const forms = await sql<{ seed_key: string; form: string; picked: string }[]>`
        select i.seed_key, v.form, f.seed_key as picked
        from ingredient_variants v
        join ingredients i on i.id = v.ingredient_id
        join ingredient_forms f on f.id = v.form_id
        order by i.seed_key, v.form
      `;
      expect(forms).toEqual([
        { seed_key: 'fixtura exemplaris', form: 'Root', picked: 'root' },
        { seed_key: 'fixtura testalis', form: 'Herb', picked: 'herb' },
        { seed_key: 'fixtura testalis', form: 'Oil', picked: 'oil' },
      ]);
    });

    // M14.1: the two flags are the literal's, each its own, and off where the
    // literal leaves them out.
    it('flags an entry and a form toxic exactly where the literal says so', async () => {
      const entries = await sql<{ seed_key: string; toxic: boolean }[]>`
        select seed_key, toxic from ingredients order by seed_key
      `;
      expect(entries).toEqual([
        { seed_key: 'fixtura exemplaris', toxic: false },
        { seed_key: 'fixtura testalis', toxic: true },
      ]);

      const forms = await sql<{ seed_key: string; form: string; toxic: boolean }[]>`
        select i.seed_key, v.form, v.toxic from ingredient_variants v
        join ingredients i on i.id = v.ingredient_id
        order by i.seed_key, v.form
      `;
      expect(forms).toEqual([
        { seed_key: 'fixtura exemplaris', form: 'Root', toxic: false },
        { seed_key: 'fixtura testalis', form: 'Herb', toxic: false },
        { seed_key: 'fixtura testalis', form: 'Oil', toxic: true },
      ]);
    });

    it('writes the folk names, the deities in order and linked, and the categories on the entry and on a form', async () => {
      const testwort = await ingredientId('fixtura testalis');
      expect(await countOf('ingredient_folk_names', `where ingredient_id = '${testwort}'`)).toBe(2);

      const deities = await sql<{ position: number; seed_key: string }[]>`
        select d.position, v.seed_key from ingredient_deities d
        join deities v on v.id = d.deity_id
        where d.ingredient_id = ${testwort} order by d.position
      `;
      expect(deities).toEqual([
        { position: 0, seed_key: 'hecate' },
        { position: 1, seed_key: 'artemis' },
      ]);

      const filed = await sql<{ form: string | null; category: string }[]>`
        select v.form, c.seed_key as category from ingredient_categories ic
        join categories c on c.id = ic.category_id
        left join ingredient_variants v on v.id = ic.variant_id
        where ic.ingredient_id = ${testwort} order by v.form nulls first, c.seed_key
      `;
      expect(filed).toEqual([
        { form: null, category: 'protection' },
        { form: null, category: 'warding' },
        { form: 'Oil', category: 'healing' },
      ]);
    });

    it('links a substitute by identity and form, and keeps a typed one as its name', async () => {
      const testwort = await ingredientId('fixtura testalis');
      const rows = await sql<
        {
          form: string | null;
          substitute_id: string | null;
          named_form: string | null;
          name: string | null;
        }[]
      >`
        select v.form, s.substitute_id, sv.form as named_form, s.name
        from ingredient_substitutes s
        left join ingredient_variants v on v.id = s.variant_id
        left join ingredient_variants sv on sv.id = s.substitute_variant_id
        where s.ingredient_id = ${await ingredientId('fixtura exemplaris')}
        order by v.form nulls first, s.name nulls first
      `;
      expect(rows).toEqual([
        { form: null, substitute_id: testwort, named_form: 'Herb', name: null },
        { form: null, substitute_id: null, named_form: null, name: 'Mockroot' },
        { form: 'Root', substitute_id: testwort, named_form: 'Herb', name: null },
      ]);
    });

    it('links each citation to the entry or the form it supports, with its locator', async () => {
      const links = await sql<
        { entry: string | null; form: string | null; title: string; locator: string | null }[]
      >`
        select i.seed_key as entry, v.form, r.title, l.locator
        from reference_links l
        join "references" r on r.id = l.reference_id
        left join ingredients i on i.id = l.ingredient_id
        left join ingredient_variants v on v.id = l.ingredient_variant_id
        where l.ingredient_id is not null or l.ingredient_variant_id is not null
        order by i.seed_key nulls last, v.form nulls first, r.title
      `;
      expect(links).toEqual([
        { entry: 'fixtura exemplaris', form: null, title: 'Samplewort', locator: null },
        { entry: 'fixtura testalis', form: null, title: 'A Fixture Herbal', locator: 'p. 12' },
        { entry: null, form: 'Herb', title: 'A Fixture Herbal', locator: 'p. 13' },
        { entry: null, form: 'Oil', title: 'Samplewort', locator: null },
        { entry: null, form: 'Root', title: 'A Fixture Herbal', locator: 'p. 40' },
      ]);
      // Two works, one row each, keyed by their citation.
      const keyed = await sql<{ seed_key: string }[]>`
        select seed_key from "references" where title in ('A Fixture Herbal', 'Samplewort')
      `;
      expect(keyed.map((row) => row.seed_key).sort()).toEqual(
        Object.values(FILE_SOURCES).map(citationText).sort(),
      );
    });
  });

  it('links a work the sources seed already wrote rather than writing it twice', async () => {
    const shared = SOURCES[0].reference;
    // Precondition: the sources seed wrote it.
    expect(
      await countOf('references', `where seed_key = '${citationText(shared).replace(/'/g, "''")}'`),
    ).toBe(1);

    const testwort = fileOf(TESTWORT, (file) =>
      file.entry.references.push({
        source: 'the-shared-work',
        locator: 'under "Testwort"',
        supports: ['description'],
        nameBasis: 'stated',
      }),
    );
    await seedCompendium(
      db,
      loadedOf([testwort, fileOf(SAMPLEWORT)], { 'the-shared-work': shared }),
    );

    expect(
      await countOf('references', `where seed_key = '${citationText(shared).replace(/'/g, "''")}'`),
    ).toBe(1);
    const [link] = await sql<{ locator: string }[]>`
      select l.locator from reference_links l join "references" r on r.id = l.reference_id
      where r.seed_key = ${citationText(shared)} and l.ingredient_id = ${await ingredientId('fixtura testalis')}
    `;
    expect(link.locator).toBe('under "Testwort"');
  });

  describe('an entry already present is left as it is, with nothing beneath it written', () => {
    /** Testwort's children, which a skipped entry must not gain. */
    const childrenOfTestwort = (id: string) =>
      Promise.all(
        [
          'ingredient_variants',
          'ingredient_folk_names',
          'ingredient_deities',
          'ingredient_categories',
          'reference_links',
        ].map((table) => countOf(table, `where ingredient_id = '${id}'`)),
      );

    it('by its seed key, after an admin renamed and retired it', async () => {
      await seedCompendium(db, fixtureFiles());
      const testwort = await ingredientId('fixtura testalis');
      await sql`
        update ingredients set canonical_name = 'Fixtura renamia', slug = 'testwort-fixtura-renamia',
          deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID}
        where id = ${testwort}
      `;
      const before = await compendiumRows();

      await seedCompendium(db, fixtureFiles());

      expect(await compendiumRows()).toEqual(before);
    });

    it('by a live identity an admin wrote, which is not stamped', async () => {
      await insertAdminEntry('Admin Testwort', 'Fixtura testalis');

      await seedCompendium(db, fixtureFiles());

      const [admin] = await sql<{ id: string; seed_key: string | null }[]>`
        select id, seed_key from ingredients where identity_key = 'fixtura testalis'
      `;
      expect(admin.seed_key).toBeNull();
      expect(await childrenOfTestwort(admin.id)).toEqual([0, 0, 0, 0, 0]);
      // Precondition: the run wrote, so the skip was the entry's own.
      expect(await countOf('ingredients', `where seed_key = 'fixtura exemplaris'`)).toBe(1);
    });

    it('by a live slug an admin holds under another identity', async () => {
      await insertAdminEntry('Testwort', 'Fixtura-testalis');

      await seedCompendium(db, fixtureFiles());

      expect(await countOf('ingredients', `where seed_key = 'fixtura testalis'`)).toBe(0);
      expect(await countOf('ingredients', `where seed_key = 'fixtura exemplaris'`)).toBe(1);
    });
  });

  // M14.23: a source's spelling, which the deity seed loads as an other name.
  it('links a deity an entry names by one of its other names, stored under the deity name', async () => {
    const testwort = fileOf(TESTWORT, (file) => file.entry.deities?.push('Ganesh'));

    await seedCompendium(db, loadedOf([testwort, fileOf(SAMPLEWORT)]));

    const deities = await sql<{ name: string; seed_key: string; position: number }[]>`
      select d.name, v.seed_key, d.position from ingredient_deities d
      join deities v on v.id = d.deity_id
      where d.ingredient_id = ${await ingredientId('fixtura testalis')} order by d.position`;
    expect(deities).toEqual([
      { name: 'Hecate', seed_key: 'hecate', position: 0 },
      { name: 'Artemis', seed_key: 'artemis', position: 1 },
      { name: 'Ganesha', seed_key: 'ganesha', position: 2 },
    ]);
  });

  // Retiring the picks changes the shared vocabularies, so this describe
  // seeds them afresh for whatever runs after it.
  describe('with a pick an admin retired', () => {
    afterAll(seedSharedVocabularies);

    it('skips a pick an admin retired: the form with all it carries, and the deity', async () => {
      await sql`update ingredient_forms set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID} where seed_key = 'oil'`;
      await sql`update deities set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID} where seed_key = 'hecate'`;

      await seedCompendium(db, fixtureFiles());

      const testwort = await ingredientId('fixtura testalis');
      const forms = await sql<
        { form: string }[]
      >`select form from ingredient_variants where ingredient_id = ${testwort}`;
      expect(forms).toEqual([{ form: 'Herb' }]);
      expect(
        await countOf(
          'ingredient_categories',
          `where ingredient_id = '${testwort}' and variant_id is not null`,
        ),
      ).toBe(0);
      const deities = await sql<{ name: string; position: number }[]>`
        select name, position from ingredient_deities where ingredient_id = ${testwort}
      `;
      expect(deities).toEqual([{ name: 'Artemis', position: 0 }]);
    });
  });

  // These two read a database with no vocabulary, or with no bootstrap user.
  describe('on an empty database', () => {
    beforeEach(async () => {
      await truncateAllTables(sql);
    });
    afterAll(seedSharedVocabularies);

    it('throws on a form no seed wrote, and writes nothing', async () => {
      await seedCategories(db);
      await seedAstrology(db);
      await seedDeities(db);

      await expect(seedCompendium(db, fixtureFiles())).rejects.toThrow();

      expect(await countOf('ingredients')).toBe(0);
    });

    it('refuses a file that fails its guard before opening a transaction', async () => {
      const unsourced = fileOf(TESTWORT, (file) => (file.entry.references = []));

      await expect(seedCompendium(db, loadedOf([unsourced, fileOf(SAMPLEWORT)]))).rejects.toThrow();

      // Not even the bootstrap user the transaction opens with.
      expect(await countOf('users')).toBe(0);
    });
  });

  describe('after the standard scenario', () => {
    beforeEach(async () => {
      await truncateAllTables(sql);
    });
    afterAll(seedSharedVocabularies);

    it('runs after the standard scenario, leaving the entries it already holds unstamped', async () => {
      await seed(db, { scenario: 'standard' });
      const standard = new Set(
        (
          await sql<
            { identity_key: string }[]
          >`select identity_key from ingredients where workspace_id is null`
        ).map((row) => row.identity_key),
      );
      const entries = loadCompendium()
        .files.filter((file) => file.status === 'approved')
        .map((file) => file.entry);
      // Precondition: the two overlap, so a skip by identity is exercised.
      expect(entries.some((entry) => standard.has(identityOf(entry)))).toBe(true);

      await seedCompendium(db);

      const keyed = await sql<
        { seed_key: string }[]
      >`select seed_key from ingredients where seed_key is not null`;
      expect(keyed.map((row) => row.seed_key).sort()).toEqual(
        entries
          .map(identityOf)
          .filter((identity) => !standard.has(identity))
          .sort(),
      );
    });
  });
});

// M14.7: a present entry is updated only when its file says so (`seedUpdate`,
// the hash of the file as read) and nobody's work on the site stands in the
// way. Every case seeds the two fixture entries from files, then runs the
// seed again on an edited copy, and reads the rows back.
describe('the update path (M14.7)', () => {
  const PATH = entryFilePath(TESTWORT);
  const A_ID = FIXTURE_USERS.A.id;

  /** The two entries as the first run read them. */
  const baseline = (): RenderableEntryFile[] => [fileOf(TESTWORT), fileOf(SAMPLEWORT)];

  /** A copy of `entry`'s file with `edit` applied, marked for update unless `mark` is false. */
  function edited(
    entry: SeedCompendiumEntry,
    edit: (entry: SeedCompendiumEntry) => void,
    { mark = true, overwrite = false }: { mark?: boolean; overwrite?: boolean } = {},
  ): RenderableEntryFile {
    const file = fileOf(entry, (draft) => edit(draft.entry));
    if (mark) file.seedUpdate = parsed(file).hash;
    if (overwrite) file.overwriteEditor = true;
    return file;
  }

  const run = (files: RenderableEntryFile[], options: SeedCompendiumOptions = {}) =>
    seedCompendium(db, loadedOf(files), { manifest: null, ...options });

  const reword = (words: number) => (entry: SeedCompendiumEntry) => {
    entry.description = wordsOf(words);
  };

  /** Everything the first edit of case 3 changes at once. */
  function bigEdit(entry: SeedCompendiumEntry): void {
    entry.description = wordsOf(121);
    entry.folkNames = ['Proofleaf', 'Newleaf Proof'];
    entry.categories = [...(entry.categories ?? []), 'Healing'];
    entry.variants.push({
      form: 'Root',
      references: [
        { source: 'fixture-herbal', locator: 'p. 14', nameBasis: 'stated', supports: ['form'] },
      ],
    });
  }

  async function testwortRow() {
    const [row] = await sql<
      {
        id: string;
        description: string;
        seed_content_hash: string | null;
        updated_by: string;
        // A string: drizzle(sql) switches this client's timestamp parsing off.
        updated_at: string;
        curator_reviewed_at: Date | null;
        deleted_at: Date | null;
      }[]
    >`
      select id, description, seed_content_hash, updated_by, updated_at, curator_reviewed_at, deleted_at
      from ingredients where seed_key = ${identityOf(TESTWORT)}`;
    return row;
  }

  /** The file's hash, which is what the row stores once the file is read. */
  const hashOf = (entry: SeedCompendiumEntry, edit: (entry: SeedCompendiumEntry) => void) =>
    parsed(fileOf(entry, (draft) => edit(draft.entry))).hash;

  let first: Awaited<ReturnType<typeof run>>;

  beforeEach(async () => {
    first = await run(baseline());
    await sql`
      insert into users (id, name, email, created_by, updated_by)
      values (${A_ID}, 'Fixture Person A', ${`${A_ID}@users.test`}, ${A_ID}, ${A_ID})`;
  });

  it('stores each file hash on insert, and a second run changes nothing', async () => {
    expect(first.inserted).toBe(2);
    const stored = await sql<{ seed_key: string; seed_content_hash: string }[]>`
      select seed_key, seed_content_hash from ingredients order by seed_key`;
    expect(stored).toEqual([
      { seed_key: identityOf(SAMPLEWORT), seed_content_hash: parsed(fileOf(SAMPLEWORT)).hash },
      { seed_key: identityOf(TESTWORT), seed_content_hash: parsed(fileOf(TESTWORT)).hash },
    ]);
    const before = await compendiumRows();

    const second = await run(baseline());

    expect(second).toEqual({ ...emptyReport(), skipped: 2 });
    expect(await compendiumRows()).toEqual(before);
  });

  it('reports an edit that is not marked as pending, and writes nothing', async () => {
    const before = await compendiumRows();

    const report = await run([edited(TESTWORT, reword(121), { mark: false }), fileOf(SAMPLEWORT)]);

    expect(report.pending).toEqual([{ where: PATH, differs: ['description'] }]);
    expect(report.updated).toEqual([]);
    expect(report.refused).toEqual([]);
    expect(await compendiumRows()).toEqual(before);
  });

  it('reports a mark gone stale, an edit made after marking, as pending', async () => {
    const before = await compendiumRows();
    const marked = edited(TESTWORT, reword(121));
    // The file moved on after the mark was written.
    marked.entry.description = wordsOf(123);
    expect(marked.seedUpdate).not.toBe(parsed(marked).hash);

    // Below the guard: seedCompendium refuses a stale mark before it gets here
    // (the next case), so the pending outcome is the content layer's.
    const loaded = loadedOf([marked, fileOf(SAMPLEWORT)]);
    const report = await beginSeedTransaction(db, (tx) =>
      seedCompendiumContent(tx, loaded, { manifest: null }),
    );

    expect(report.pending).toEqual([{ where: PATH, differs: ['description'] }]);
    expect(report.updated).toEqual([]);
    expect(await compendiumRows()).toEqual(before);
  });

  it('refuses to run at all on a mark gone stale, because the guard fails it', async () => {
    const before = await compendiumRows();
    const marked = edited(TESTWORT, reword(121));
    marked.entry.description = wordsOf(123);
    expect(marked.seedUpdate).not.toBe(parsed(marked).hash);

    await expect(run([marked, fileOf(SAMPLEWORT)])).rejects.toThrow(/stale seedUpdate/);
    expect(await compendiumRows()).toEqual(before);
  });

  // M14.23: the edit the entry files waiting on M14.23 make once marked.
  it('links a deity a marked edit adds by one of its other names, under the deity name', async () => {
    const report = await run([
      edited(TESTWORT, (entry) => entry.deities?.push('Woden')),
      fileOf(SAMPLEWORT),
    ]);

    expect(report.updated).toEqual([PATH]);
    const deities = await sql<{ name: string; seed_key: string; position: number }[]>`
      select d.name, v.seed_key, d.position from ingredient_deities d
      join deities v on v.id = d.deity_id
      where d.ingredient_id = ${(await testwortRow()).id} and d.deleted_at is null
      order by d.position`;
    expect(deities).toEqual([
      { name: 'Hecate', seed_key: 'hecate', position: 0 },
      { name: 'Artemis', seed_key: 'artemis', position: 1 },
      { name: 'Odin', seed_key: 'odin', position: 2 },
    ]);
  });

  it('applies a marked edit to the entry and its children, keeping the forms it keeps', async () => {
    const row = await testwortRow();
    const herb = await variantIdOf(sql, row.id, 'Herb');
    const oil = await variantIdOf(sql, row.id, 'Oil');

    const report = await run([edited(TESTWORT, bigEdit), fileOf(SAMPLEWORT)]);

    expect(report.updated).toEqual([PATH]);
    expect(report.refused).toEqual([]);
    expect(report.skipped).toBe(1);

    const after = await testwortRow();
    expect(after.description).toBe(wordsOf(121));
    expect(after.seed_content_hash).toBe(hashOf(TESTWORT, bigEdit));
    expect(after.updated_by).toBe(BOOTSTRAP_USER_ID);
    expect(Date.parse(after.updated_at)).toBeGreaterThan(Date.parse(row.updated_at));

    expect((await liveFolkNames(sql, row.id)).map((name) => name.name)).toEqual([
      'Newleaf Proof',
      'Proofleaf',
    ]);
    const [gone] = await sql<{ deleted_at: Date | null; deleted_by: string | null }[]>`
      select deleted_at, deleted_by from ingredient_folk_names
      where ingredient_id = ${row.id} and name = 'Fixture Herb'`;
    expect(gone.deleted_at).not.toBeNull();
    expect(gone.deleted_by).toBe(BOOTSTRAP_USER_ID);

    const categories = await sql<{ category: string }[]>`
      select c.seed_key as category from ingredient_categories ic
      join categories c on c.id = ic.category_id
      where ic.ingredient_id = ${row.id} and ic.variant_id is null order by c.seed_key`;
    expect(categories.map((c) => c.category)).toEqual(['healing', 'protection', 'warding']);

    const forms = (await variantRowsOf(sql, row.id)).filter((v) => v.deleted_at === null);
    expect(forms.map((v) => v.form)).toEqual(['Herb', 'Oil', 'Root']);
    expect(await variantIdOf(sql, row.id, 'Herb')).toBe(herb);
    expect(await variantIdOf(sql, row.id, 'Oil')).toBe(oil);
    expect(
      await countOf(
        'reference_links',
        `where ingredient_variant_id = '${await variantIdOf(sql, row.id, 'Root')}' and deleted_at is null`,
      ),
    ).toBe(1);

    // What the seed itself soft-deleted is not an editor's work: the next edit lands too.
    const again = (entry: SeedCompendiumEntry) => {
      bigEdit(entry);
      entry.description = wordsOf(122);
    };
    const next = await run([edited(TESTWORT, again), fileOf(SAMPLEWORT)]);
    expect(next.refused).toEqual([]);
    expect(next.updated).toEqual([PATH]);
    expect((await testwortRow()).description).toBe(wordsOf(122));
  });

  it('soft-deletes a form the file no longer lists, when no coven holds it', async () => {
    const { id } = await testwortRow();
    const dropOil = (entry: SeedCompendiumEntry) => {
      entry.variants = entry.variants.filter((variant) => variant.form !== 'Oil');
    };

    const report = await run([edited(TESTWORT, dropOil), fileOf(SAMPLEWORT)]);

    expect(report.updated).toEqual([PATH]);
    const rows = await variantRowsOf(sql, id);
    const oil = rows.find((v) => v.form === 'Oil');
    expect(oil?.deleted_at).not.toBeNull();
    expect(oil?.deleted_by).toBe(BOOTSTRAP_USER_ID);
    expect(rows.find((v) => v.form === 'Herb')?.deleted_at).toBeNull();
  });

  it('refuses to remove a form a coven holds in stock, until the stock is gone', async () => {
    const { id } = await testwortRow();
    const oil = await variantIdOf(sql, id, 'Oil');
    const [workspace] = await sql<{ id: string }[]>`
      insert into workspaces ${sql({
        ...workspaceColumns(makeWorkspace({ name: 'Fixture Lapsed Coven' })),
        created_by: A_ID,
        updated_by: A_ID,
      })} returning id`;
    const stock = await insertStock(
      sql,
      { workspaceId: workspace.id, ingredientId: id, variantId: oil },
      A_ID,
    );
    const dropOil = (entry: SeedCompendiumEntry) => {
      entry.variants = entry.variants.filter((variant) => variant.form !== 'Oil');
    };
    const files = () => [edited(TESTWORT, dropOil), fileOf(SAMPLEWORT)];
    // Why the refusal could have been something else: the file is marked and
    // nothing else stands in the way.
    expect(
      await countOf('inventory_items', `where variant_id = '${oil}' and deleted_at is null`),
    ).toBe(1);
    const before = await compendiumRows();

    const report = await run(files());

    expect(report.refused).toHaveLength(1);
    expect(report.refused[0]).toMatchObject({ where: PATH, reason: REASONS.formInUse });
    expect(report.updated).toEqual([]);
    expect(await variantIdOf(sql, id, 'Oil')).toBe(oil);
    expect(await compendiumRows()).toEqual(before);

    // M14.26: --force lifts refusals 1 to 4 only; a form in use stays refused.
    const forced = await run(files(), { force: true });

    expect(forced.refused).toHaveLength(1);
    expect(forced.refused[0]).toMatchObject({ where: PATH, reason: REASONS.formInUse });
    expect(forced.updated).toEqual([]);
    expect(await compendiumRows()).toEqual(before);

    await sql`update inventory_items set deleted_at = now(), deleted_by = ${A_ID} where id = ${stock}`;
    const retry = await run(files());

    expect(retry.refused).toEqual([]);
    expect(retry.updated).toEqual([PATH]);
    expect((await variantRowsOf(sql, id)).find((v) => v.form === 'Oil')?.deleted_at).not.toBeNull();
  });

  /**
   * Refusals 1 to 3: someone worked on the entry at the site. Each case sets
   * the work up, checks it took, and names the reason the run prints.
   */
  const SITE_WORK: { name: string; reason: string; setUp: () => Promise<void> }[] = [
    {
      name: 'a curator-reviewed entry',
      reason: REASONS.reviewed,
      setUp: async () => {
        await sql`update ingredients set curator_reviewed_at = now(), curator_reviewed_by = ${BOOTSTRAP_USER_ID}
          where seed_key = ${identityOf(TESTWORT)}`;
        expect((await testwortRow()).curator_reviewed_at).not.toBeNull();
      },
    },
    {
      name: 'an entry a person last changed',
      reason: REASONS.edited,
      setUp: async () => {
        await asTouch(sql, async (tx) => {
          await tx`update ingredients set updated_by = ${A_ID} where seed_key = ${identityOf(TESTWORT)}`;
        });
        expect((await testwortRow()).updated_by).toBe(A_ID);
      },
    },
    {
      name: 'an entry whose form a person last changed',
      reason: `child ${REASONS.edited}: ingredient_variants`,
      setUp: async () => {
        const { id } = await testwortRow();
        await asTouch(sql, async (tx) => {
          await tx`update ingredient_variants set updated_by = ${A_ID}
            where ingredient_id = ${id} and form = 'Herb'`;
        });
        // The entry row itself is the seed's, so the child is what is refused on.
        expect((await testwortRow()).updated_by).toBe(BOOTSTRAP_USER_ID);
      },
    },
    {
      name: 'an entry whose folk name a person deleted',
      reason: `child ${REASONS.edited}: ingredient_folk_names`,
      setUp: async () => {
        const { id } = await testwortRow();
        await asTouch(sql, async (tx) => {
          await tx`update ingredient_folk_names set deleted_at = now(), deleted_by = ${A_ID}
            where ingredient_id = ${id} and name = 'Proofleaf'`;
        });
        expect((await testwortRow()).updated_by).toBe(BOOTSTRAP_USER_ID);
      },
    },
  ];

  /**
   * Refused with `reason` and nothing written; then the same marked edit,
   * with the file's `overwriteEditor` or the run's `force`, lands, and the
   * row comes out unreviewed.
   */
  async function expectRefusedThenLanded(
    reason: string,
    lift: { overwrite: true } | { force: true },
  ): Promise<void> {
    const before = await compendiumRows();

    const report = await run([edited(TESTWORT, reword(121)), fileOf(SAMPLEWORT)]);

    expect(report.refused).toHaveLength(1);
    expect(report.refused[0]).toMatchObject({ where: PATH, reason });
    expect(report.refused[0].differs).toContain('description');
    expect(hasRefusals(report)).toBe(true);
    expect(report.updated).toEqual([]);
    expect(await compendiumRows()).toEqual(before);

    const landed =
      'overwrite' in lift
        ? await run([edited(TESTWORT, reword(121), { overwrite: true }), fileOf(SAMPLEWORT)])
        : await run([edited(TESTWORT, reword(121)), fileOf(SAMPLEWORT)], { force: true });

    expect(landed.refused).toEqual([]);
    expect(landed.updated).toEqual([PATH]);
    const after = await testwortRow();
    expect(after.description).toBe(wordsOf(121));
    expect(after.seed_content_hash).toBe(hashOf(TESTWORT, reword(121)));
    expect(after.curator_reviewed_at).toBeNull();
  }

  describe('refuses an entry someone worked on at the site, unless the file says to overwrite', () => {
    it.each(SITE_WORK)('$name', async ({ reason, setUp }) => {
      await setUp();
      await expectRefusedThenLanded(reason, { overwrite: true });
    });
  });

  it('refuses an update when the row has no baseline hash and no manifest names it', async () => {
    await sql`update ingredients set seed_content_hash = null where seed_key = ${identityOf(TESTWORT)}`;
    const before = await compendiumRows();

    const report = await run([edited(TESTWORT, reword(121)), fileOf(SAMPLEWORT)]);

    expect(report.refused).toHaveLength(1);
    expect(report.refused[0]).toMatchObject({ where: PATH, reason: REASONS.noBaseline });
    expect(report.refused[0].differs).toContain('description');
    expect(report.updated).toEqual([]);
    expect(await compendiumRows()).toEqual(before);
  });

  // M14.26: `db:seed:compendium -- --force` lifts refusals 1 to 4 for every
  // entry in the run, with no `overwriteEditor` in any file. The mark rule
  // still holds: an edit nobody marked stays pending.
  describe('--force lifts refusals 1 to 4 for every entry', () => {
    it.each(SITE_WORK)('$name', async ({ reason, setUp }) => {
      await setUp();
      await expectRefusedThenLanded(reason, { force: true });
    });

    it('an entry with no baseline hash that no manifest names', async () => {
      await sql`update ingredients set seed_content_hash = null where seed_key = ${identityOf(TESTWORT)}`;
      expect((await testwortRow()).seed_content_hash).toBeNull();

      await expectRefusedThenLanded(REASONS.noBaseline, { force: true });
    });

    it('a curator-reviewed entry and an edited one in the same run, each losing the curator mark', async () => {
      await sql`update ingredients set curator_reviewed_at = now(), curator_reviewed_by = ${BOOTSTRAP_USER_ID}`;
      await asTouch(sql, async (tx) => {
        await tx`update ingredients set updated_by = ${A_ID} where seed_key = ${identityOf(SAMPLEWORT)}`;
      });
      expect(
        await countOf('ingredients', 'where curator_reviewed_at is not null'),
        'both rows start reviewed',
      ).toBe(2);

      const report = await run([edited(TESTWORT, reword(121)), edited(SAMPLEWORT, reword(111))], {
        force: true,
      });

      expect(report.refused).toEqual([]);
      expect([...report.updated].sort()).toEqual([PATH, entryFilePath(SAMPLEWORT)].sort());
      expect(await countOf('ingredients', 'where curator_reviewed_at is not null')).toBe(0);
    });

    it('leaves an edit nobody marked pending, and writes nothing', async () => {
      await sql`update ingredients set curator_reviewed_at = now(), curator_reviewed_by = ${BOOTSTRAP_USER_ID}
        where seed_key = ${identityOf(TESTWORT)}`;
      const before = await compendiumRows();

      const report = await run(
        [edited(TESTWORT, reword(121), { mark: false }), fileOf(SAMPLEWORT)],
        {
          force: true,
        },
      );

      expect(report.pending).toEqual([{ where: PATH, differs: ['description'] }]);
      expect(report.updated).toEqual([]);
      expect(await compendiumRows()).toEqual(before);
    });

    it('decides a forced dry run, then writes nothing', async () => {
      await sql`update ingredients set curator_reviewed_at = now(), curator_reviewed_by = ${BOOTSTRAP_USER_ID}
        where seed_key = ${identityOf(TESTWORT)}`;
      const before = await compendiumRows();

      const report = await run([edited(TESTWORT, reword(121)), fileOf(SAMPLEWORT)], {
        force: true,
        dryRun: true,
      });

      expect(report.updated).toEqual([PATH]);
      expect(await compendiumRows()).toEqual(before);
    });
  });

  describe('adoption of a hash the conversion manifest holds', () => {
    const manifestOf = () => ({ [identityOf(TESTWORT)]: parsed(fileOf(TESTWORT)).hash });

    async function withoutHash(): Promise<void> {
      await sql`update ingredients set seed_content_hash = null where seed_key = ${identityOf(TESTWORT)}`;
    }

    it('takes the manifest hash as the baseline of an untouched row, writing nothing else', async () => {
      await withoutHash();
      const before = await testwortRow();

      const report = await run(baseline(), { manifest: manifestOf() });

      expect(report.adopted).toEqual([{ where: PATH, differs: [] }]);
      expect(report.skipped).toBe(2);
      expect(report.refused).toEqual([]);
      const after = await testwortRow();
      expect(after.seed_content_hash).toBe(manifestOf()[identityOf(TESTWORT)]);
      expect(after.updated_at).toEqual(before.updated_at);
      expect(after.updated_by).toBe(before.updated_by);
    });

    it('adopts and then applies a marked edit in the same run', async () => {
      await withoutHash();

      const report = await run([edited(TESTWORT, reword(121)), fileOf(SAMPLEWORT)], {
        manifest: manifestOf(),
      });

      expect(report.adopted).toHaveLength(1);
      expect(report.adopted[0].where).toBe(PATH);
      expect(report.adopted[0].differs).toContain('description');
      expect(report.updated).toEqual([PATH]);
      const after = await testwortRow();
      expect(after.description).toBe(wordsOf(121));
      expect(after.seed_content_hash).toBe(hashOf(TESTWORT, reword(121)));
    });

    it('does not adopt a row a person has worked on', async () => {
      await asTouch(sql, async (tx) => {
        await tx`update ingredients set seed_content_hash = null, updated_by = ${A_ID}
          where seed_key = ${identityOf(TESTWORT)}`;
      });

      const report = await run(baseline(), { manifest: manifestOf() });

      expect(report.adopted).toEqual([]);
      expect(report.refused).toHaveLength(1);
      expect(report.refused[0]).toMatchObject({ where: PATH, reason: REASONS.noBaseline });
      expect((await testwortRow()).seed_content_hash).toBeNull();
    });
  });

  // M14.1: a row seeded before its file said `toxic: true` can hold the file's
  // hash (the conversion manifest's, adopted) without its content. A matching
  // hash skips only a row that matches its file as well.
  describe('a row whose hash matches its file but whose content does not', () => {
    const fileHash = () => parsed(fileOf(TESTWORT)).hash;
    /** Marked for update at its own hash: the file as it stands, approved. */
    const marked = (options: { overwrite?: boolean } = {}) => edited(TESTWORT, () => {}, options);

    async function toxicOf(): Promise<boolean> {
      const [row] = await sql<{ toxic: boolean }[]>`
        select toxic from ingredients where seed_key = ${identityOf(TESTWORT)}`;
      return row.toxic;
    }

    /** The row as the old shards wrote it: unflagged, under the hash of a file that flags it. */
    async function unflag(): Promise<void> {
      await sql`update ingredients set toxic = false where seed_key = ${identityOf(TESTWORT)}`;
      expect(TESTWORT.toxic).toBe(true);
      expect(await toxicOf()).toBe(false);
      expect((await testwortRow()).seed_content_hash).toBe(fileHash());
    }

    /** A person's edit on the row: the seed's stamp replaced by A's. */
    async function editedByA(): Promise<void> {
      await asTouch(sql, async (tx) => {
        await tx`update ingredients set updated_by = ${A_ID} where seed_key = ${identityOf(TESTWORT)}`;
      });
      expect((await testwortRow()).updated_by).toBe(A_ID);
    }

    /** A curator's mark on the row. */
    async function reviewed(): Promise<void> {
      await sql`update ingredients set curator_reviewed_at = now(), curator_reviewed_by = ${BOOTSTRAP_USER_ID}
        where seed_key = ${identityOf(TESTWORT)}`;
      expect((await testwortRow()).curator_reviewed_at).not.toBeNull();
    }

    it('reports an unmarked file as pending with what differs, and writes nothing', async () => {
      await unflag();
      const before = await compendiumRows();

      const report = await run(baseline());

      expect(report.pending).toEqual([{ where: PATH, differs: ['toxic'] }]);
      expect(report.skipped).toBe(1);
      expect(report.updated).toEqual([]);
      expect(report.refused).toEqual([]);
      expect(await compendiumRows()).toEqual(before);
    });

    it('applies a marked file, flagging the row', async () => {
      await unflag();

      const report = await run([marked(), fileOf(SAMPLEWORT)]);

      expect(report.updated).toEqual([PATH]);
      expect(report.refused).toEqual([]);
      expect(await toxicOf()).toBe(true);
      const after = await testwortRow();
      expect(after.seed_content_hash).toBe(fileHash());
      expect(after.updated_by).toBe(BOOTSTRAP_USER_ID);
    });

    /** A matching hash, a differing field and a person's work: the work stays, and the run says nothing of it. */
    async function expectQuietSkip(files = [marked(), fileOf(SAMPLEWORT)]): Promise<void> {
      const before = await compendiumRows();

      const report = await run(files);

      expect(report).toEqual({ ...emptyReport(), skipped: 2 });
      expect(await toxicOf()).toBe(false);
      expect(await compendiumRows()).toEqual(before);
    }

    it('skips a marked file quietly when a person edited the row on the site, keeping the edit', async () => {
      await unflag();
      await editedByA();

      await expectQuietSkip();
      expect((await testwortRow()).updated_by).toBe(A_ID);
    });

    it('skips a marked file quietly when a curator reviewed the row, keeping the review', async () => {
      await unflag();
      await reviewed();

      await expectQuietSkip();
      expect((await testwortRow()).curator_reviewed_at).not.toBeNull();
    });

    it('skips a marked file quietly even with the overwrite flag, which was on the file when the person worked', async () => {
      await unflag();
      await editedByA();

      await expectQuietSkip([marked({ overwrite: true }), fileOf(SAMPLEWORT)]);
      expect((await testwortRow()).updated_by).toBe(A_ID);
    });

    // M14.26: the run's --force is the one thing that goes past the quiet skip,
    // since the owner's rule is that a person's edit stays until a forced refresh.
    describe('under --force', () => {
      it('applies a marked file when a person edited the row, overwriting the edit', async () => {
        await unflag();
        await editedByA();

        const report = await run([marked(), fileOf(SAMPLEWORT)], { force: true });

        expect(report.updated).toEqual([PATH]);
        expect(report.refused).toEqual([]);
        expect(await toxicOf()).toBe(true);
        const after = await testwortRow();
        expect(after.updated_by).toBe(BOOTSTRAP_USER_ID);
        expect(after.seed_content_hash).toBe(fileHash());
      });

      it('applies a marked file when a curator reviewed the row, clearing the mark', async () => {
        await unflag();
        await reviewed();

        const report = await run([marked(), fileOf(SAMPLEWORT)], { force: true });

        expect(report.updated).toEqual([PATH]);
        expect(report.refused).toEqual([]);
        expect(await toxicOf()).toBe(true);
        expect((await testwortRow()).curator_reviewed_at).toBeNull();
      });

      it('leaves an unmarked file pending when a person edited the row, and writes nothing', async () => {
        await unflag();
        await editedByA();
        const before = await compendiumRows();

        const report = await run(baseline(), { force: true });

        expect(report.pending).toEqual([{ where: PATH, differs: ['toxic'] }]);
        expect(report.updated).toEqual([]);
        expect(await toxicOf()).toBe(false);
        expect(await compendiumRows()).toEqual(before);
      });

      it('still skips a marked file whose row matches it, keeping the edit', async () => {
        await editedByA();
        expect(await toxicOf()).toBe(true);
        const before = await compendiumRows();

        const report = await run([marked(), fileOf(SAMPLEWORT)], { force: true });

        expect(report).toEqual({ ...emptyReport(), skipped: 2 });
        expect(await compendiumRows()).toEqual(before);
      });
    });

    it('adopts the manifest hash and then applies a marked file in the same run', async () => {
      await unflag();
      await sql`update ingredients set seed_content_hash = null where seed_key = ${identityOf(TESTWORT)}`;

      const report = await run([marked(), fileOf(SAMPLEWORT)], {
        manifest: { [identityOf(TESTWORT)]: fileHash() },
      });

      expect(report.adopted).toEqual([{ where: PATH, differs: ['toxic'] }]);
      expect(report.updated).toEqual([PATH]);
      expect(report.refused).toEqual([]);
      expect(await toxicOf()).toBe(true);
      expect((await testwortRow()).seed_content_hash).toBe(fileHash());
    });

    it('still skips a marked file whose row matches it, writing nothing', async () => {
      expect(await toxicOf()).toBe(true);
      expect((await testwortRow()).seed_content_hash).toBe(fileHash());
      const before = await compendiumRows();

      const report = await run([marked(), fileOf(SAMPLEWORT)]);

      expect(report).toEqual({ ...emptyReport(), skipped: 2 });
      expect(await compendiumRows()).toEqual(before);
    });
  });

  it.each([
    { lift: 'the overwrite flag', overwrite: true, force: false },
    { lift: '--force', overwrite: false, force: true },
  ])(
    'refuses a change of identity, which is the admin screens, even with $lift',
    async ({ overwrite, force }) => {
      const rename = (entry: SeedCompendiumEntry) => {
        entry.name = 'Testwort Proper';
      };
      const before = await compendiumRows();

      const report = await run([edited(TESTWORT, rename, { overwrite }), fileOf(SAMPLEWORT)], {
        force,
      });

      expect(report.refused).toHaveLength(1);
      expect(report.refused[0]).toMatchObject({
        where: entryFilePath({ ...TESTWORT, name: 'Testwort Proper' }),
        reason: REASONS.identity,
      });
      expect(report.updated).toEqual([]);
      expect(await compendiumRows()).toEqual(before);
    },
  );

  // M14.8: the seed never sets the curator mark. A row it inserts, and a row it
  // updates, both come out unreviewed; only a curator's switch marks an entry.
  const markOf = async () => {
    const [row] = await sql<{ at: Date | null; by: string | null }[]>`
      select curator_reviewed_at as at, curator_reviewed_by as by
      from ingredients where seed_key = ${identityOf(TESTWORT)}`;
    return row;
  };

  it('leaves a row it inserted unreviewed', async () => {
    expect(await markOf()).toEqual({ at: null, by: null });
  });

  it('leaves a row it updated unreviewed', async () => {
    const report = await run([edited(TESTWORT, reword(121)), fileOf(SAMPLEWORT)]);

    expect(report.updated).toEqual([PATH]);
    expect((await testwortRow()).description).toBe(wordsOf(121));
    expect(await markOf()).toEqual({ at: null, by: null });
  });

  it('refuses to update a marked row, and keeps its mark', async () => {
    await sql`update ingredients set curator_reviewed_at = now(), curator_reviewed_by = ${BOOTSTRAP_USER_ID}
      where seed_key = ${identityOf(TESTWORT)}`;
    const marked = await markOf();
    expect(marked.at).not.toBeNull();

    const report = await run([edited(TESTWORT, reword(121)), fileOf(SAMPLEWORT)]);

    expect(report.updated).toEqual([]);
    expect(report.refused).toMatchObject([{ where: PATH, reason: REASONS.reviewed }]);
    expect(await markOf()).toEqual(marked);
  });

  it('applies the entries it may and refuses the others, in one report', async () => {
    await sql`update ingredients set curator_reviewed_at = now(), curator_reviewed_by = ${BOOTSTRAP_USER_ID}
      where seed_key = ${identityOf(TESTWORT)}`;
    const testwort = await testwortRow();

    const report = await run([edited(TESTWORT, reword(121)), edited(SAMPLEWORT, reword(111))]);

    const samplewortPath = entryFilePath(SAMPLEWORT);
    expect(report.updated).toEqual([samplewortPath]);
    expect(report.refused.map((r) => ({ where: r.where, reason: r.reason }))).toEqual([
      { where: PATH, reason: REASONS.reviewed },
    ]);
    expect(hasRefusals(report)).toBe(true);
    const [sample] = await sql<{ description: string }[]>`
      select description from ingredients where seed_key = ${identityOf(SAMPLEWORT)}`;
    expect(sample.description).toBe(wordsOf(111));
    expect((await testwortRow()).description).toBe(testwort.description);
  });

  it('leaves an entry a curator retired retired, however its file changes', async () => {
    await sql`update ingredients set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID}
      where seed_key = ${identityOf(TESTWORT)}`;
    const before = await compendiumRows();

    const report = await run([edited(TESTWORT, reword(121)), fileOf(SAMPLEWORT)]);

    expect(report.retired).toEqual([PATH]);
    expect(report.refused).toEqual([]);
    expect(report.updated).toEqual([]);
    expect((await testwortRow()).deleted_at).not.toBeNull();
    expect(await compendiumRows()).toEqual(before);
  });

  // M14.30: an entry M14.29 ruled out stays in every database seeded before,
  // because the seed never deletes a row whose file is gone. Migration 0090
  // soft-deletes it by seed key; a file that ever names it again must find it
  // retired and leave it so.
  describe('an entry migration 0090 retired', () => {
    const RETIRED = 'Aquilaria malaccensis';

    beforeEach(async () => {
      await sql`update ingredients set canonical_name = ${RETIRED}, seed_key = lower(${RETIRED})
        where seed_key = ${identityOf(TESTWORT)}`;
      const statements = readFileSync(
        fromRoot('src/db/migrations/0090_retire-endangered-entries.sql'),
        'utf8',
      )
        .split('--> statement-breakpoint')
        .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
        .filter(Boolean);
      for (const statement of statements) await sql.unsafe(statement);
    });

    const retiredRow = async () => {
      const [row] = await sql<{ deleted_at: Date | null }[]>`
        select deleted_at from ingredients where seed_key = lower(${RETIRED})`;
      return row;
    };

    it('is reported as retired by a file that names it again, and not revived', async () => {
      const before = await compendiumRows();
      const named = fileOf(TESTWORT, (draft) => {
        draft.entry.canonicalName = RETIRED;
      });

      const report = await run([named]);

      expect(report.retired).toEqual([entryFilePath({ ...TESTWORT, canonicalName: RETIRED })]);
      expect(report.refused).toEqual([]);
      expect((await retiredRow()).deleted_at).not.toBeNull();
      expect(await compendiumRows()).toEqual(before);
    });

    it('stays retired when the seed runs without its file', async () => {
      await run([fileOf(TESTWORT)]);

      expect((await retiredRow()).deleted_at).not.toBeNull();
    });
  });

  it('decides and reports a dry run, then writes nothing', async () => {
    const before = await compendiumRows();

    const report = await run([edited(TESTWORT, bigEdit), fileOf(SAMPLEWORT)], { dryRun: true });

    expect(report.updated).toEqual([PATH]);
    expect(await compendiumRows()).toEqual(before);
    expect((await testwortRow()).seed_content_hash).toBe(parsed(fileOf(TESTWORT)).hash);
  });
});

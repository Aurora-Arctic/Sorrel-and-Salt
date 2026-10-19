import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { seed } from '@/db/seed/index';
import { seedAstrology } from '@/db/seed/astrology';
import { seedCategories } from '@/db/seed/categories';
import { seedCompendium } from '@/db/seed/compendium';
import { COMPENDIUM } from '@/db/seed/compendium/index';
import { seedDeities } from '@/db/seed/deities';
import { seedForms } from '@/db/seed/forms';
import { SOURCES, seedSources } from '@/db/seed/sources';
import { identityOf } from '@/db/seed/standard';
import { citationText } from '@/lib/citation';
import { entryRecency } from '@/lib/entry-recency';
import { FIXTURE_SHARD } from './compendium-fixture';
import type { SeedCompendiumShard } from '@/db/seed/types';

// MB.242: the compendium seed writes each entry whole, once, on the invented
// fixture shard, against the real tables emptied first. The shape every seed
// shares — stamps, a second run a no-op, nothing resurrected — is
// index.test.ts's; the guard's rules are compendium-literals.test.ts's.

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

beforeEach(async () => {
  await truncateAllTables(sql);
});

describe('seedCompendium', () => {
  describe('on an empty compendium', () => {
    beforeEach(async () => {
      await seedVocabularies();
      await seedCompendium(db, [FIXTURE_SHARD]);
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
        Object.values(FIXTURE_SHARD.sources).map(citationText).sort(),
      );
    });
  });

  it('links a work the sources seed already wrote rather than writing it twice', async () => {
    await seedVocabularies();
    const shared = SOURCES[0].reference;
    // Precondition: the sources seed wrote it.
    expect(
      await countOf('references', `where seed_key = '${citationText(shared).replace(/'/g, "''")}'`),
    ).toBe(1);

    const shard: SeedCompendiumShard = structuredClone(FIXTURE_SHARD);
    shard.sources['the-shared-work'] = shared;
    shard.entries[0].references.push({
      source: 'the-shared-work',
      locator: 'under "Testwort"',
      supports: ['description'],
    });
    await seedCompendium(db, [shard]);

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
      await seedVocabularies();
      await seedCompendium(db, [FIXTURE_SHARD]);
      const testwort = await ingredientId('fixtura testalis');
      await sql`
        update ingredients set canonical_name = 'Fixtura renamia', slug = 'testwort-fixtura-renamia',
          deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID}
        where id = ${testwort}
      `;
      const before = await compendiumRows();

      await seedCompendium(db, [FIXTURE_SHARD]);

      expect(await compendiumRows()).toEqual(before);
    });

    it('by a live identity an admin wrote, which is not stamped', async () => {
      await seedVocabularies();
      await insertAdminEntry('Admin Testwort', 'Fixtura testalis');

      await seedCompendium(db, [FIXTURE_SHARD]);

      const [admin] = await sql<{ id: string; seed_key: string | null }[]>`
        select id, seed_key from ingredients where identity_key = 'fixtura testalis'
      `;
      expect(admin.seed_key).toBeNull();
      expect(await childrenOfTestwort(admin.id)).toEqual([0, 0, 0, 0, 0]);
      // Precondition: the run wrote, so the skip was the entry's own.
      expect(await countOf('ingredients', `where seed_key = 'fixtura exemplaris'`)).toBe(1);
    });

    it('by a live slug an admin holds under another identity', async () => {
      await seedVocabularies();
      await insertAdminEntry('Testwort', 'Fixtura-testalis');

      await seedCompendium(db, [FIXTURE_SHARD]);

      expect(await countOf('ingredients', `where seed_key = 'fixtura testalis'`)).toBe(0);
      expect(await countOf('ingredients', `where seed_key = 'fixtura exemplaris'`)).toBe(1);
    });
  });

  it('skips a pick an admin retired: the form with all it carries, and the deity', async () => {
    await seedVocabularies();
    await sql`update ingredient_forms set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID} where seed_key = 'oil'`;
    await sql`update deities set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID} where seed_key = 'hecate'`;

    await seedCompendium(db, [FIXTURE_SHARD]);

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

  it('throws on a form no seed wrote, and writes nothing', async () => {
    await seedCategories(db);
    await seedAstrology(db);
    await seedDeities(db);

    await expect(seedCompendium(db, [FIXTURE_SHARD])).rejects.toThrow();

    expect(await countOf('ingredients')).toBe(0);
  });

  it('refuses a literal that fails its guard before opening a transaction', async () => {
    const shard = structuredClone(FIXTURE_SHARD);
    shard.entries[0].references = [];

    await expect(seedCompendium(db, [shard])).rejects.toThrow();

    // Not even the bootstrap user the transaction opens with.
    expect(await countOf('users')).toBe(0);
  });

  it('runs after the standard scenario, leaving the entries it already holds unstamped', async () => {
    await seed(db, { scenario: 'standard' });
    const standard = new Set(
      (
        await sql<
          { identity_key: string }[]
        >`select identity_key from ingredients where workspace_id is null`
      ).map((row) => row.identity_key),
    );
    const entries = COMPENDIUM.flatMap((shard) => shard.entries);
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

// MB.106, accepted on purpose: the marker reads its two stamps, a seed writes
// both when it runs, so a freshly seeded database shows every entry as New for
// its first 30 days. Naming it keeps it from being mistaken for a bug.
describe('a freshly seeded compendium (accepted: every entry reads New)', () => {
  it('marks every entry New', async () => {
    await truncateAllTables(sql);
    await seedVocabularies();
    await seedCompendium(db, [FIXTURE_SHARD]);

    const stamps = await sql<{ created_at: Date; updated_at: Date }[]>`
      select created_at, updated_at from ingredients where workspace_id is null and deleted_at is null`;

    // Why "every" could have been vacuous: the seed wrote entries.
    expect(stamps.length).toBeGreaterThan(0);
    expect(stamps.map((row) => entryRecency(row.created_at, row.updated_at))).toEqual(
      stamps.map(() => 'new'),
    );
  });
});

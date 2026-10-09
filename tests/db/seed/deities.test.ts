import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { fromRoot } from '../../support/paths';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { seedAstrology } from '@/db/seed/astrology';
import { DEITIES, DEITY_TRADITIONS, seedDeities } from '@/db/seed/deities';
import { deitySlug, slugify } from '@/lib/slugify';
import type { DeityRow, DeityTraditionRow, DocDeity, DocDeityTradition } from './types';

// MB.127's traditions and deities, asserted against the seed doc's own two
// tables rather than a copy, against the clone, which holds the vocabulary as
// `standard` wrote it through the same function; a re-run over an admin's
// edit empties the tables first, and the shape every seed shares is
// index.test.ts's (MB.183) — claude-docs/db/deity-vocabulary-seed.md, "The deity vocabulary seed".

const SEED_DOC = fromRoot('claude-docs/db/deity-vocabulary-seed.md');

// --- the seed doc, parsed ---------------------------------------------------

/** The table rows between two headings, each split into its trimmed cells. */
function tableRows(doc: string, from: string, to: string): string[][] {
  const start = doc.indexOf(from);
  const end = doc.indexOf(to, start);

  if (start === -1 || end === -1) {
    throw new Error(`The deity seed doc no longer reads "${from}" … "${to}"`);
  }

  return doc
    .slice(start, end)
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .filter((cells) => cells[0] !== 'Name' && !cells[0].startsWith('---'));
}

const DOC = readFileSync(SEED_DOC, 'utf8');

const DOC_TRADITIONS: DocDeityTradition[] = tableRows(DOC, '### Traditions', '### Deities').map(
  ([name, description]) => ({ name, description }),
);

const DOC_DEITIES: DocDeity[] = tableRows(DOC, '### Deities', '### What is left out').map(
  ([name, tradition, description]) => ({ name, tradition, description }),
);

// --- database ---------------------------------------------------------------

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

async function allTraditions(): Promise<DeityTraditionRow[]> {
  return sql<DeityTraditionRow[]>`select * from deity_traditions order by slug`;
}

async function allDeities(): Promise<DeityRow[]> {
  return sql<DeityRow[]>`select * from deities order by slug`;
}

async function countOf(table: string): Promise<number> {
  const [{ count }] = await sql<{ count: string }[]>`select count(*) from ${sql(table)}`;
  return Number(count);
}

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);
});

afterAll(async () => {
  await sql.end();
});

describe('the seed data matches the deity seed doc', () => {
  // Precondition: both tables really were parsed, into the counts the doc
  // states — otherwise every "matches the doc" test below is vacuously true.
  it('parses the doc’s two tables, thirty-five traditions and 216 deities', () => {
    expect(DOC_TRADITIONS).toHaveLength(35);
    expect(DOC_DEITIES).toHaveLength(216);
    expect(DOC_TRADITIONS[0]).toEqual(expect.objectContaining({ name: 'Greek' }));
    expect(DOC_DEITIES[0]).toEqual(expect.objectContaining({ name: 'Adonis', tradition: 'Greek' }));
  });

  it('files every deity the doc lists under one of the doc’s own traditions', () => {
    const traditions = new Set(DOC_TRADITIONS.map((tradition) => tradition.name));

    expect(DOC_DEITIES.filter((deity) => !traditions.has(deity.tradition))).toEqual([]);
  });

  it('seeds every tradition, in the doc’s order, with its description, and nothing else', () => {
    expect(DEITY_TRADITIONS).toEqual(DOC_TRADITIONS);
  });

  // Copied as written, never title-cased: `Manannan mac Lir`.
  it('seeds every deity, in the doc’s order, under its tradition, and nothing else', () => {
    expect(DEITIES).toEqual(DOC_DEITIES);
  });

  // The doc groups deities in tradition order; a deity filed out of its run
  // would still pass the comparison above if the doc itself drifted.
  it('keeps each tradition’s deities together, in the traditions’ order', () => {
    const runs = DEITIES.map((deity) => deity.tradition).filter(
      (tradition, index, all) => tradition !== all[index - 1],
    );

    expect(runs).toEqual(DEITY_TRADITIONS.map((tradition) => tradition.name));
  });
});

describe('every row is distinct and explains itself', () => {
  const TABLES = [
    { table: 'deity_traditions', rows: DEITY_TRADITIONS },
    { table: 'deities', rows: DEITIES },
  ] as const;

  for (const { table, rows } of TABLES) {
    it(`gives no two ${table} the same name, or the same slug`, () => {
      const names = rows.map((row) => row.name);
      const slugs = names.map(slugify);

      expect(new Set(names).size).toBe(names.length);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it(`gives each of the ${table} a non-empty description`, () => {
      expect(rows.filter((row) => row.description.trim() === '')).toEqual([]);
    });

    // A description copied from the row above is non-empty and explains nothing.
    it(`gives no two ${table} the same description`, () => {
      const descriptions = rows.map((row) => row.description);

      expect(new Set(descriptions).size).toBe(descriptions.length);
    });
  }
});

describe('seedDeities(db)', () => {
  // A deity's slug carries its tradition (MB.132), as a form's carries its group.
  it('writes each name as written, its slug derived from it and a deity’s tradition', async () => {
    const seeded = [...(await allTraditions()), ...(await allDeities())];
    const wanted = [
      ...DEITY_TRADITIONS.map(({ name, description }) => ({
        name,
        description,
        slug: slugify(name),
      })),
      ...DEITIES.map(({ name, tradition, description }) => ({
        name,
        description,
        slug: deitySlug(name, tradition),
      })),
    ];

    expect(seeded.map(({ name, slug, description }) => ({ name, slug, description }))).toEqual(
      expect.arrayContaining(wanted),
    );
    expect(seeded.map((row) => row.name)).toContain('Manannan mac Lir');
  });

  it('writes the traditions before the deities, each deity pointing at its own', async () => {
    const traditionNameById = new Map(
      (await allTraditions()).map((tradition) => [tradition.id, tradition.name]),
    );
    // Both sides sorted here: Postgres's collation and `localeCompare` place
    // `dian-cecht` and `diana` differently.
    const byKey = (a: { key: string }, b: { key: string }) => (a.key < b.key ? -1 : 1);
    const seeded = (await allDeities()).map((deity) => ({
      key: String(deity.seed_key),
      tradition: traditionNameById.get(deity.tradition_id),
    }));

    expect(seeded.sort(byKey)).toEqual(
      DEITIES.map((deity) => ({ key: slugify(deity.name), tradition: deity.tradition })).sort(
        byKey,
      ),
    );
  });

  // MB.172: a row is the seed's by the key it gave it (MB.171), not by the
  // slug, which follows the name an admin may change. The key is the slug of
  // the name, as every database seeded before MB.132 holds it, and never
  // changes after; a deity's slug carries its tradition beside it.
  it('keys every row it writes by the slug of its name', async () => {
    const traditions = await allTraditions();
    const deities = await allDeities();
    // Precondition: the vocabulary is there to be keyed.
    expect(traditions.length + deities.length).toBe(DEITY_TRADITIONS.length + DEITIES.length);
    for (const row of [...traditions, ...deities]) {
      expect(row.seed_key, row.slug).toBe(slugify(row.name));
    }
    expect(deities.find((deity) => deity.seed_key === 'apollo')?.slug).toBe('apollo-greek');
  });

  describe('over a database an admin has edited', () => {
    beforeEach(async () => {
      await truncateAllTables(sql);
      // Precondition: the truncated clone really starts empty, so the rows edited are this run's.
      expect(await countOf('deities')).toBe(0);
    });

    // The vocabulary is the admin's (MB.127), and a description is the part of
    // a curated row most likely to be rewritten.
    it('does not overwrite a description an admin has since rewritten', async () => {
      await seedDeities(db);
      await sql`
        update deities set description = 'Rewritten by an admin.' where seed_key = 'apollo'
      `;
      await sql`
        update deity_traditions set description = 'Also rewritten.' where slug = 'greek'
      `;

      await seedDeities(db);

      const [apollo] = (await allDeities()).filter((deity) => deity.seed_key === 'apollo');
      const [greek] = (await allTraditions()).filter((tradition) => tradition.slug === 'greek');
      expect(apollo.description).toBe('Rewritten by an admin.');
      expect(greek.description).toBe('Also rewritten.');
    });

    it('leaves a deity and tradition an admin has since renamed alone, and adds nothing', async () => {
      await seedDeities(db);
      // As the admin pages would leave them: every deity under the renamed
      // tradition re-slugged under its new name, so the backfill finds nothing to do.
      await sql`update deity_traditions set name = 'Hellenic', slug = 'hellenic' where slug = 'greek'`;
      await sql`update deities set name = 'Phoebus' where seed_key = 'apollo'`;
      const [hellenic] = await sql<{ id: string }[]>`
        select id from deity_traditions where slug = 'hellenic'`;
      for (const { id, name } of await sql<{ id: string; name: string }[]>`
        select id, name from deities where tradition_id = ${hellenic.id}`) {
        await sql`update deities set slug = ${deitySlug(name, 'Hellenic')} where id = ${id}`;
      }
      const [traditions, deities] = [await allTraditions(), await allDeities()];
      // Precondition: neither slug is its key's any more, so slug keying would twin both.
      const renamed = [...traditions, ...deities].filter(({ slug }) =>
        ['phoebus-hellenic', 'hellenic'].includes(slug),
      );
      expect(renamed.map(({ slug, seed_key }) => [slug, seed_key])).toEqual(
        expect.arrayContaining([
          ['phoebus-hellenic', 'apollo'],
          ['hellenic', 'greek'],
        ]),
      );

      await seedDeities(db);

      expect(await allTraditions()).toEqual(traditions);
      expect(await allDeities()).toEqual(deities);
    });

    it('files a missing deity under its renamed tradition, found by the tradition’s key', async () => {
      await seedDeities(db);
      await sql`update deity_traditions set name = 'Hellenic', slug = 'hellenic' where slug = 'greek'`;
      await sql`delete from deities where seed_key = 'apollo'`;

      await seedDeities(db);

      const [hellenic] = (await allTraditions()).filter(({ slug }) => slug === 'hellenic');
      const [apollo] = (await allDeities()).filter(({ seed_key }) => seed_key === 'apollo');
      expect(await countOf('deity_traditions')).toBe(DOC_TRADITIONS.length);
      expect(apollo).toMatchObject({ tradition_id: hellenic.id, slug: 'apollo-hellenic' });
    });

    // Unkeyed is what marks it as not the seed's; the author does not matter to
    // the seed, so it is the one user an emptied database holds once a seed ran.
    it('takes a live row an admin wrote under a seed name as present, without an error', async () => {
      await seedAstrology(db);
      const [admin] = await sql<{ id: string }[]>`
        insert into deity_traditions (name, slug, description, created_by, updated_by)
        values ('Greek', 'greek', 'Written by an admin first.', ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
        returning id
      `;

      await expect(seedDeities(db)).resolves.toBeUndefined();

      const greek = (await allTraditions()).filter(({ slug }) => slug === 'greek');
      expect(greek.map(({ id, seed_key }) => [id, seed_key])).toEqual([[admin.id, null]]);
      const [apollo] = (await allDeities()).filter(({ seed_key }) => seed_key === 'apollo');
      expect(apollo.tradition_id).toBe(admin.id);
    });

    // The seed is the backfill, as it is for the forms (M5.6a): a database
    // seeded before MB.132 holds `slugify(name)`, and a SQL rewrite would be a
    // second slug rule.
    describe('the slugs a database seeded before MB.132 holds', () => {
      it('re-derives every live deity’s slug from its name and its tradition’s, as the bootstrap user', async () => {
        await seedDeities(db);
        await sql`update deities set slug = seed_key`;
        // The precondition: every slug is the old rule's.
        expect((await allDeities()).filter((deity) => deity.slug !== deity.seed_key)).toEqual([]);

        await seedDeities(db);

        const traditionNameById = new Map(
          (await allTraditions()).map((tradition) => [tradition.id, tradition.name]),
        );
        for (const deity of await allDeities()) {
          expect(deity.slug, deity.name).toBe(
            deitySlug(deity.name, traditionNameById.get(deity.tradition_id) as string),
          );
          expect(deity.updated_by, deity.name).toBe(BOOTSTRAP_USER_ID);
        }
      });

      it('writes only the rows whose slug differs, and leaves a deleted deity as it was', async () => {
        await seedDeities(db);
        await sql`update deities set slug = 'apollo' where seed_key = 'apollo'`;
        await sql`
          update deities set slug = 'hermes', deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID}
          where seed_key = 'hermes'`;
        const others = (await allDeities()).filter((deity) => deity.seed_key !== 'apollo');

        await seedDeities(db);

        const deities = await allDeities();
        expect(deities.find((deity) => deity.seed_key === 'apollo')?.slug).toBe('apollo-greek');
        expect(deities.filter((deity) => deity.seed_key !== 'apollo')).toEqual(others);
      });
    });
  });
});

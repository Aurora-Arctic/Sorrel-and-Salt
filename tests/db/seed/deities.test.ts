import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { fromRoot } from '../../support/paths';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { DEITIES, DEITY_TRADITIONS, seedDeities } from '@/db/seed/deities';
import { slugify } from '@/lib/slugify';
import type { DeityRow, DeityTraditionRow, DocDeity, DocDeityTradition } from './types';

// MB.127's traditions and deities, asserted against the seed doc's own two
// tables rather than a copy, against the real tables emptied first —
// claude-docs/db/deity-vocabulary-seed.md, "The deity vocabulary seed".

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

beforeEach(async () => {
  await truncateAllTables(sql);
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
  // Precondition: the truncated clone really starts at zero.
  it('starts from two empty tables', async () => {
    expect(await countOf('deity_traditions')).toBe(0);
    expect(await countOf('deities')).toBe(0);

    await seedDeities(db);

    expect(await countOf('deity_traditions')).toBe(DOC_TRADITIONS.length);
    expect(await countOf('deities')).toBe(DOC_DEITIES.length);
  });

  it('writes each name as written, its slug derived from it', async () => {
    await seedDeities(db);

    const seeded = [...(await allTraditions()), ...(await allDeities())];
    const wanted = [...DEITY_TRADITIONS, ...DEITIES];

    expect(seeded.map(({ name, slug, description }) => ({ name, slug, description }))).toEqual(
      expect.arrayContaining(
        wanted.map(({ name, description }) => ({ name, slug: slugify(name), description })),
      ),
    );
    expect(seeded.map((row) => row.name)).toContain('Manannan mac Lir');
  });

  it('writes the traditions before the deities, each deity pointing at its own', async () => {
    await seedDeities(db);

    const traditionNameById = new Map(
      (await allTraditions()).map((tradition) => [tradition.id, tradition.name]),
    );
    // Both sides sorted here: Postgres's collation and `localeCompare` place
    // `dian-cecht` and `diana` differently.
    const bySlug = (a: { slug: string }, b: { slug: string }) => (a.slug < b.slug ? -1 : 1);
    const seeded = (await allDeities()).map((deity) => ({
      slug: deity.slug,
      tradition: traditionNameById.get(deity.tradition_id),
    }));

    expect(seeded.sort(bySlug)).toEqual(
      DEITIES.map((deity) => ({ slug: slugify(deity.name), tradition: deity.tradition })).sort(
        bySlug,
      ),
    );
  });

  it('stamps every row as the bootstrap user, with no tombstone', async () => {
    await seedDeities(db);

    for (const row of [...(await allTraditions()), ...(await allDeities())]) {
      expect(row.created_by, row.slug).toBe(BOOTSTRAP_USER_ID);
      expect(row.updated_by, row.slug).toBe(BOOTSTRAP_USER_ID);
      expect(row.deleted_at, row.slug).toBeNull();
    }
  });

  it('is idempotent: re-running adds nothing and moves nothing', async () => {
    await seedDeities(db);
    const traditions = await allTraditions();
    const deities = await allDeities();

    await expect(seedDeities(db)).resolves.toBeUndefined();

    expect(await allTraditions()).toEqual(traditions);
    expect(await allDeities()).toEqual(deities);
  });

  // The vocabulary is the admin's (MB.127), and a description is the part of
  // a curated row most likely to be rewritten.
  it('does not overwrite a description an admin has since rewritten', async () => {
    await seedDeities(db);
    await sql`
      update deities set description = 'Rewritten by an admin.' where slug = 'apollo'
    `;
    await sql`
      update deity_traditions set description = 'Also rewritten.' where slug = 'greek'
    `;

    await seedDeities(db);

    const [apollo] = (await allDeities()).filter((deity) => deity.slug === 'apollo');
    const [greek] = (await allTraditions()).filter((tradition) => tradition.slug === 'greek');
    expect(apollo.description).toBe('Rewritten by an admin.');
    expect(greek.description).toBe('Also rewritten.');
  });

  // Keyed on the slug, ignoring `deleted_at`: the partial index stops only a second live row.
  it('does not resurrect a deity or tradition an admin has since deleted', async () => {
    await seedDeities(db);
    await sql`
      update deities set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID}
      where slug = 'aradia'
    `;
    await sql`
      update deity_traditions set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID}
      where slug = 'wicca'
    `;

    await seedDeities(db);

    const aradia = (await allDeities()).filter((deity) => deity.slug === 'aradia');
    const wicca = (await allTraditions()).filter((tradition) => tradition.slug === 'wicca');
    expect(aradia).toHaveLength(1);
    expect(aradia[0].deleted_at).not.toBeNull();
    expect(wicca).toHaveLength(1);
    expect(wicca[0].deleted_at).not.toBeNull();
  });

  it('publishes the bootstrap user as app.current_user_id, as withAudit would', async () => {
    await sql`create table seed_deities_probe (slug text, acting_user text)`;
    await sql.unsafe(`
      create function seed_deities_probe() returns trigger language plpgsql as $$
      begin
        insert into seed_deities_probe (slug, acting_user)
        values (new.slug, current_setting('app.current_user_id', true));
        return new;
      end
      $$
    `);
    await sql.unsafe(`
      create trigger seed_deities_probe after insert on deities
      for each row execute function seed_deities_probe()
    `);

    await seedDeities(db);

    const rows = await sql<{ acting_user: string | null }[]>`
      select acting_user from seed_deities_probe
    `;
    expect(rows).toHaveLength(DOC_DEITIES.length);
    expect(rows.every((row) => row.acting_user === BOOTSTRAP_USER_ID)).toBe(true);
  });
});

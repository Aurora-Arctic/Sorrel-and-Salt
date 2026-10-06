import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { fromRoot } from '../../support/paths';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { PLANETS, ZODIAC_SIGNS, seedAstrology } from '@/db/seed/astrology';
import { slugify } from '@/lib/slugify';
import type { VocabularyRow } from './types';

// §5's planet and zodiac vocabularies, asserted against §5's own table rather
// than a copy, against the real tables emptied first — claude-docs/db/astrology-vocabulary-seed.md,
// "The astrology vocabulary seed".

const DESIGN_DOC = fromRoot('claude-docs/DESIGN.md');

// --- DESIGN.md §5, parsed ---------------------------------------------------

function designSection5(): string {
  const doc = readFileSync(DESIGN_DOC, 'utf8');
  const start = doc.indexOf('**`planets`** and **`zodiac_signs`**');

  if (start === -1) throw new Error('DESIGN.md §5 no longer has a `planets` paragraph');

  return doc.slice(start, doc.indexOf('**One tier, not two.**', start));
}

/** §5's table: `| Planets | sun, moon, … |`, keyed by the vocabulary's label. */
const DESIGN_VOCABULARIES = new Map(
  designSection5()
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .map((line) => line.split('|').map((cell) => cell.trim()))
    .filter((cells) => cells[1] !== 'Vocabulary' && !cells[1].startsWith('---'))
    .map((cells) => [cells[1], cells[2].split(/,\s*/).filter(Boolean)] as const),
);

const DESIGN_PLANETS = DESIGN_VOCABULARIES.get('Planets') ?? [];
const DESIGN_ZODIAC_SIGNS = DESIGN_VOCABULARIES.get('Zodiac signs') ?? [];

const VOCABULARIES = [
  { table: 'planets', seeded: PLANETS, design: DESIGN_PLANETS },
  { table: 'zodiac_signs', seeded: ZODIAC_SIGNS, design: DESIGN_ZODIAC_SIGNS },
] as const;

// --- database ---------------------------------------------------------------

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

async function allRows(table: string): Promise<VocabularyRow[]> {
  return sql<VocabularyRow[]>`select * from ${sql(table)} order by slug`;
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

describe('the seed data matches DESIGN.md §5', () => {
  // Precondition: §5 really was parsed, into the counts it states — otherwise
  // every "covers §5" test below is vacuously true.
  it('parses §5’s own table into two vocabularies, of nineteen and thirteen', () => {
    expect([...DESIGN_VOCABULARIES.keys()]).toEqual(['Planets', 'Zodiac signs']);
    expect(DESIGN_PLANETS).toHaveLength(19);
    expect(DESIGN_ZODIAC_SIGNS).toHaveLength(13);
  });

  describe.each(VOCABULARIES)('$table', ({ seeded, design }) => {
    it('seeds every value §5’s table lists, in §5’s order, and nothing else', () => {
      expect(seeded.map((row) => row.name.toLowerCase())).toEqual(design);
    });

    it('slugs each by the shared rule', () => {
      expect(seeded.map((row) => slugify(row.name))).toEqual(design.map(slugify));
    });

    // §5 writes lower case and a seeded name is a proper noun. The tests above
    // compare case-insensitively, which is what would let a seeded "north Node"
    // through — so every word is checked, not only the first.
    it('writes every name in Title Case', () => {
      const lowerCased = (name: string) => name.split(' ').filter((word) => !/^[A-Z]/.test(word));

      for (const { name } of seeded) {
        expect(lowerCased(name), name).toEqual([]);
      }
    });

    it('gives each a non-empty description', () => {
      expect(seeded.filter((row) => row.description.trim() === '')).toEqual([]);
    });

    // A description copied from the row above is non-empty and explains nothing.
    it('gives no two the same description', () => {
      const descriptions = seeded.map((row) => row.description);

      expect(new Set(descriptions).size).toBe(descriptions.length);
    });
  });

  // §5 names the words these descriptions exist to carry: the suggestion query
  // matches a description, so each is how a reader typing it finds the row.
  it.each([
    ['Lilith', 'Black Moon'],
    ['North Node', 'Rahu'],
    ['South Node', 'Ketu'],
    ['Ophiuchus', 'Serpentarius'],
  ])('describes %s with “%s”', (name, word) => {
    const row = [...PLANETS, ...ZODIAC_SIGNS].find((row) => row.name === name);

    expect(row?.description).toContain(word);
  });
});

describe('seedAstrology(db)', () => {
  // Precondition: the truncated clone really starts at zero.
  it('starts from two empty tables and fills both', async () => {
    expect(await countOf('planets')).toBe(0);
    expect(await countOf('zodiac_signs')).toBe(0);

    await seedAstrology(db);

    expect(await countOf('planets')).toBe(DESIGN_PLANETS.length);
    expect(await countOf('zodiac_signs')).toBe(DESIGN_ZODIAC_SIGNS.length);
  });

  it.each(VOCABULARIES)(
    'writes each $table row as the literal reads',
    async ({ table, seeded }) => {
      await seedAstrology(db);

      const written = (await allRows(table)).map(({ name, slug, description }) => ({
        name,
        slug,
        description,
      }));

      expect(written).toEqual(
        seeded
          .map(({ name, description }) => ({ name, slug: slugify(name), description }))
          .sort((a, b) => a.slug.localeCompare(b.slug)),
      );
    },
  );

  it('stamps every row as the bootstrap user, with no tombstone', async () => {
    await seedAstrology(db);

    for (const row of [...(await allRows('planets')), ...(await allRows('zodiac_signs'))]) {
      expect(row.created_by, row.slug).toBe(BOOTSTRAP_USER_ID);
      expect(row.updated_by, row.slug).toBe(BOOTSTRAP_USER_ID);
      expect(row.deleted_at, row.slug).toBeNull();
    }
  });

  it('is idempotent: re-running adds nothing and moves nothing', async () => {
    await seedAstrology(db);
    const planets = await allRows('planets');
    const signs = await allRows('zodiac_signs');

    await expect(seedAstrology(db)).resolves.toBeUndefined();

    expect(await allRows('planets')).toEqual(planets);
    expect(await allRows('zodiac_signs')).toEqual(signs);
  });

  // The vocabulary is the admin's (MB.91), and a description is the part of a
  // curated row most likely to be rewritten.
  it('does not overwrite a description an admin has since rewritten', async () => {
    await seedAstrology(db);
    await sql`
      update zodiac_signs set description = 'The Bull - fixed earth, ruled by Venus.'
      where slug = 'taurus'
    `;

    await seedAstrology(db);

    const [taurus] = (await allRows('zodiac_signs')).filter((row) => row.slug === 'taurus');
    expect(taurus.description).toBe('The Bull - fixed earth, ruled by Venus.');
  });

  // Keyed on the slug, ignoring `deleted_at`: the partial index stops only a second live row.
  it('does not resurrect a body an admin has since deleted', async () => {
    await seedAstrology(db);
    await sql`
      update planets set deleted_at = now(), deleted_by = ${BOOTSTRAP_USER_ID}
      where slug = 'earth'
    `;

    await seedAstrology(db);

    const earth = (await allRows('planets')).filter((row) => row.slug === 'earth');
    expect(earth).toHaveLength(1);
    expect(earth[0].deleted_at).not.toBeNull();
  });

  it('keys every row it writes by its slug at insert', async () => {
    await seedAstrology(db);

    for (const row of [...(await allRows('planets')), ...(await allRows('zodiac_signs'))]) {
      expect(row.seed_key, row.slug).toBe(row.slug);
    }
  });

  // MB.172: the key, not the slug an admin's rename moves, is what the seed knows.
  it('leaves a body an admin has since renamed alone, and adds nothing', async () => {
    await seedAstrology(db);
    await sql`update planets set name = 'Terra', slug = 'terra' where slug = 'earth'`;
    const planets = await allRows('planets');
    // Precondition: the slug is no longer the key, so slug keying would twin it.
    expect(planets.find(({ slug }) => slug === 'terra')?.seed_key).toBe('earth');

    await seedAstrology(db);

    expect(await allRows('planets')).toEqual(planets);
  });

  it('publishes the bootstrap user as app.current_user_id, as withAudit would', async () => {
    await sql`create table seed_astrology_probe (slug text, acting_user text)`;
    await sql.unsafe(`
      create function seed_astrology_probe() returns trigger language plpgsql as $$
      begin
        insert into seed_astrology_probe (slug, acting_user)
        values (new.slug, current_setting('app.current_user_id', true));
        return new;
      end
      $$
    `);
    for (const table of ['planets', 'zodiac_signs']) {
      await sql.unsafe(`
        create trigger seed_astrology_probe after insert on ${table}
        for each row execute function seed_astrology_probe()
      `);
    }

    await seedAstrology(db);

    const rows = await sql<{ acting_user: string | null }[]>`
      select acting_user from seed_astrology_probe
    `;
    expect(rows).toHaveLength(DESIGN_PLANETS.length + DESIGN_ZODIAC_SIGNS.length);
    expect(rows.every((row) => row.acting_user === BOOTSTRAP_USER_ID)).toBe(true);
  });
});

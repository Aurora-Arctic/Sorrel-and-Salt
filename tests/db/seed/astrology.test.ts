import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { fromRoot } from '../../support/paths';
import { truncateAllTables } from '../../support/seeded-database';
import { PLANETS, ZODIAC_SIGNS, seedAstrology } from '@/db/seed/astrology';
import { slugify } from '@/lib/slugify';
import type { VocabularyRow } from './types';

// §5's planet and zodiac vocabularies, asserted against §5's own table rather
// than a copy, against the clone, which holds the vocabulary as `standard`
// wrote it through the same function; a re-run over an admin's edit empties
// the tables first, and the shape every seed shares is index.test.ts's
// (MB.183) — claude-docs/db/astrology-vocabulary-seed.md,
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

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);
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
  it.each(VOCABULARIES)(
    'writes each $table row as the literal reads',
    async ({ table, seeded }) => {
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

  it('keys every row it writes by its slug at insert', async () => {
    const rows = [...(await allRows('planets')), ...(await allRows('zodiac_signs'))];
    // Precondition: the vocabularies are there to be keyed.
    expect(rows.length).toBe(PLANETS.length + ZODIAC_SIGNS.length);
    for (const row of rows) {
      expect(row.seed_key, row.slug).toBe(row.slug);
    }
  });

  describe('over a database an admin has edited', () => {
    beforeEach(async () => {
      await truncateAllTables(sql);
      // Precondition: the truncated clone really starts empty, so the rows edited are this run's.
      expect(await allRows('planets')).toEqual([]);
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
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { seedAstrology } from '@/db/seed/astrology';
import type { VocabularyRow } from './types';

// What a re-run of the planet and zodiac seed leaves of an admin's edits; the
// shape every seed shares is index.test.ts's (MB.183), and the vocabulary's
// content is the seed doc's to review, not a test's to copy —
// claude-docs/db/astrology-vocabulary-seed.md, "The astrology vocabulary seed".

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

describe('seedAstrology(db) over a database an admin has edited', () => {
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

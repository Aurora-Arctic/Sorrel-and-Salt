import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { seedAstrology } from '@/db/seed/astrology';
import { DEITY_TRADITIONS, seedDeities } from '@/db/seed/deities';
import { deitySlug } from '@/lib/slugify';
import type { DeityRow, DeityTraditionRow } from './types';

// What a re-run of the deity seed leaves of an admin's edits, and how it finds
// its own rows by key once an admin has renamed them (MB.172). The shape every
// seed shares is index.test.ts's (MB.183), and the vocabulary's content is the
// seed doc's to review — claude-docs/db/deity-vocabulary-seed.md, "The deity vocabulary seed".

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

describe('seedDeities(db) over a database an admin has edited', () => {
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
    expect(await countOf('deity_traditions')).toBe(DEITY_TRADITIONS.length);
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
});

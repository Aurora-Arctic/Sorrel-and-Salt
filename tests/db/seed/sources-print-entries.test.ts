import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { fromRoot } from '../../support/paths';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { seedAstrology } from '@/db/seed/astrology';
import { seedDeities } from '@/db/seed/deities';
import { SOURCES, seedSources } from '@/db/seed/sources';
import { citationText } from '@/lib/citation';

// A source the seed stored before it carried its print work's details is not found by the seed, which then inserts a second copy.
// This proves the seed updates the stored row in place once the migration that rewrites the keys has run (`0115`), and twins it
// before. Retired with the migration's own test once `0115` is in production's journal.

const MIGRATION = fromRoot('src/db/migrations/0115_print-encyclopedia-entries.sql');
const STATEMENTS = readFileSync(MIGRATION, 'utf8')
  .split('--> statement-breakpoint')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

const WORK = (() => {
  const source = SOURCES.find(
    ({ reference }) => reference.title === 'Slavic Religion' && reference.kind === 'entry',
  );
  if (!source) throw new Error('sources.ts has no entry "Slavic Religion"');
  return source.reference;
})();
const NEW_KEY = citationText(WORK);

/** The row as the seed wrote it before the print details: a chapter, with no editor, edition, place, publisher, year or note. */
const OLD_COLUMNS = {
  kind: 'chapter',
  container: 'Encyclopedia of Religion',
  edition: null,
  contributors: null,
  place: null,
  publisher: null,
  published: null,
  note: null,
};
const OLD_KEY = citationText({ ...WORK, ...OLD_COLUMNS, kind: 'chapter' });

const A_ID = FIXTURE_USERS.A.id;
const PERSONS_NOTE = 'Read in the reading room';

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  db = drizzle(sql);
});

afterAll(async () => {
  await sql.end();
});

/** Seeds the sources, then puts Slavic Religion back as the seed stored it before, and returns its id. */
async function storedBefore(): Promise<string> {
  await truncateAllTables(sql);
  await seedDeities(db);
  await seedAstrology(db);
  await seedSources(db);
  const [row] = await sql<{ id: string }[]>`
    update "references" set ${sql(OLD_COLUMNS)}, seed_key = ${OLD_KEY}
    where seed_key = ${NEW_KEY} returning id`;
  return row.id;
}

const liveTitled = () => sql<{ id: string; seed_key: string }[]>`
  select id, seed_key from "references"
  where title = 'Slavic Religion' and workspace_id is null and deleted_at is null`;

const linksOf = (id: string) => sql<{ id: string }[]>`
  select id from reference_links where reference_id = ${id} and deleted_at is null order by id`;

describe('a source stored before it carried its print details', () => {
  let id: string;
  beforeEach(async () => {
    id = await storedBefore();
  });

  it('is twinned by a seed run without the migration', async () => {
    await seedSources(db);

    expect((await liveTitled()).map((row) => row.seed_key).sort()).toEqual(
      [NEW_KEY, OLD_KEY].sort(),
    );
  });

  it('is updated in place by a seed run after the migration: no second copy, the new fields, its id and links kept', async () => {
    const links = await linksOf(id);
    // Precondition: the stored row has links a twin would not carry.
    expect(links.length).toBeGreaterThan(0);

    for (const statement of STATEMENTS) await sql.unsafe(statement);
    expect(await seedSources(db)).toEqual([]);

    expect(await liveTitled()).toEqual([{ id, seed_key: NEW_KEY }]);
    const [row] = await sql`
      select kind, container, edition, contributors, place, publisher, published, note, host, url, scholarly
      from "references" where id = ${id}`;
    expect(row).toEqual({
      kind: 'entry',
      container: WORK.container,
      edition: WORK.edition,
      contributors: WORK.contributors,
      place: WORK.place,
      publisher: WORK.publisher,
      published: WORK.published,
      note: WORK.note,
      host: WORK.host,
      url: WORK.url,
      scholarly: true,
    });
    expect(await linksOf(id)).toEqual(links);
  });

  it("keeps a person's edit to the row after the migration, and reports the fields that differ", async () => {
    await sql`
      insert into users (id, name, email, created_by, updated_by)
      values (${A_ID}, 'Fixture Person A', ${`${A_ID}@users.test`}, ${A_ID}, ${A_ID})`;
    // A stamp alone is a no-op to the `updated_at` trigger, so the person changes a column too.
    await sql`update "references" set note = ${PERSONS_NOTE}, updated_by = ${A_ID} where id = ${id}`;
    // Precondition: the row is the person's, and it differs from sources.ts, so a run without the guard would overwrite it.
    const [mine] = await sql`select updated_by, note from "references" where id = ${id}`;
    expect(mine).toEqual({ updated_by: A_ID, note: PERSONS_NOTE });

    for (const statement of STATEMENTS) await sql.unsafe(statement);
    const kept = await seedSources(db);

    expect(await liveTitled()).toEqual([{ id, seed_key: NEW_KEY }]);
    const [row] = await sql`select kind, publisher, note from "references" where id = ${id}`;
    expect(row).toEqual({ kind: 'chapter', publisher: null, note: PERSONS_NOTE });
    expect(kept).toEqual([
      {
        source: NEW_KEY,
        differs: [
          'kind',
          'container',
          'contributors',
          'edition',
          'place',
          'publisher',
          'published',
          'note',
        ],
      },
    ]);
  });
});

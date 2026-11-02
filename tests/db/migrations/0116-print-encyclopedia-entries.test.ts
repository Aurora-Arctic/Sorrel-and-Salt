import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { useTestDatabase } from '../../support/db/database';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { insertReference, insertReferenceLink } from '../../support/db/insert-reference';
import { fromRoot } from '../../support/paths';
import { truncateAllTables } from '../../support/seeded-database';
import { A } from '../../support/as-user';
import { makeIngredient, makeVariant } from '../../support/fixtures';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { seedAstrology } from '@/db/seed/astrology';
import { seedCategories } from '@/db/seed/categories';
import { seedCompendium } from '@/db/seed/compendium';
import { loadCompendium, type LoadedCompendium } from '@/db/seed/compendium/load';
import { seedDeities } from '@/db/seed/deities';
import { seedForms } from '@/db/seed/forms';
import { SOURCES, seedSources } from '@/db/seed/sources';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { citationText } from '@/lib/citation';

// A migration test, retired once `0116` is in production's journal. `0116` rewrites the `seed_key` of the 22 encyclopedia sources
// the vocabulary seed now cites as entries in the print work, and of de Groot's volumes IV and VI, whose files gained a place, a
// publisher and a note, so the seed finds each stored row again rather than inserting a twin.
// The test database is already migrated and empty of compendium rows, so the statement runs again over rows each case writes.
// The sources are the real ones, since the migration names their citations.

const FILE = fromRoot('src/db/migrations/0116_print-encyclopedia-entries.sql');
const SQL_TEXT = readFileSync(FILE, 'utf8');
const STATEMENTS = SQL_TEXT.split('--> statement-breakpoint')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

/** The migration's (old key, new key) pairs, as its VALUES list writes them. */
const PAIRS = [...SQL_TEXT.matchAll(/\('((?:[^']|'')*)',\s*'((?:[^']|'')*)'\)/g)].map(
  ([, from, to]) => [from.replace(/''/g, "'"), to.replace(/''/g, "'")] as const,
);

const COMPENDIUM = loadCompendium(fromRoot('compendium'));
const DE_GROOT = ['de-groot-religious-system-of-china-v4', 'de-groot-religious-system-of-china-v6'];
const DE_GROOT_KEYS = DE_GROOT.map((handle) => citationText(COMPENDIUM.sources[handle]));
const isDeGroot = ([, to]: readonly [string, string]) => DE_GROOT_KEYS.includes(to);

/** Volume IV as `compendium/sources/` held it before it carried a place, a publisher and the title page's wording. */
const OLD_V4 = {
  ...COMPENDIUM.sources['de-groot-religious-system-of-china-v4'],
  place: undefined,
  publisher: undefined,
  scholarly: undefined,
  note: "The OCR of the title page prints no legible year (Leiden, E. J. Brill); 1901 is the Internet Archive record's date.",
};
const OLD_V4_KEY = citationText(OLD_V4);
const NEW_V4_KEY = DE_GROOT_KEYS[0];

/** The real compendium cut down to jujube, which cites volume IV, under every real source. */
function jujubeOnly(): LoadedCompendium {
  const files = COMPENDIUM.files.filter((file) => file.path.endsWith('/jujube-ziziphus-jujuba.md'));
  return {
    ...COMPENDIUM,
    files,
    shards: [
      { name: 'compendium', sources: COMPENDIUM.sources, entries: files.map((file) => file.entry) },
    ],
    unaudited: [],
  };
}

const PRINT_WORKS = [
  '_Encyclopedia of Religion_',
  '_Encyclopaedia Judaica_',
  '_Encyclopedia of India_',
  '_Contemporary American Religion_',
];

/** Gimbutas's "Slavic Religion" as the seed stored it before it carried the print details. */
const OLD_FIELDS = {
  kind: 'chapter' as const,
  authors: 'Gimbutas, Marija',
  title: 'Slavic Religion',
  container: 'Encyclopedia of Religion',
  host: 'Encyclopedia.com',
  url: 'https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/slavic-religion',
  accessed: '2026-10-06',
};
const OLD_KEY = citationText(OLD_FIELDS);
const NEW_KEY = (() => {
  const source = SOURCES.find(
    ({ reference }) => reference.title === 'Slavic Religion' && reference.kind === 'entry',
  );
  if (!source) throw new Error('sources.ts has no entry "Slavic Religion"');
  return citationText(source.reference);
})();

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients, "references" cascade`;
});

const run = async () => {
  for (const statement of STATEMENTS) await sql.unsafe(statement);
};

/** A reference stored with the old fields under `seedKey`. */
async function source(
  seedKey: string,
  extra: { workspace_id?: string; deleted?: boolean } = {},
): Promise<string> {
  const { deleted, ...columns } = extra;
  const id = await insertReference(
    sql,
    { ...OLD_FIELDS, published: null, ...columns },
    BOOTSTRAP_USER_ID,
  );
  await sql`update "references" set seed_key = ${seedKey} where id = ${id}`;
  if (deleted)
    await sql`update "references" set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;
  return id;
}

const seedKeyOf = async (id: string) => {
  const [row] = await sql<{ seed_key: string | null; deleted_at: Date | null }[]>`
    select seed_key, deleted_at from "references" where id = ${id}`;
  return row;
};

describe('0116', () => {
  it('maps an old key to the key the seed builds today for each of the 22 sources', () => {
    const wanted = SOURCES.map(({ reference }) => reference).filter((work) =>
      PRINT_WORKS.includes(work.container ?? ''),
    );
    const today = new Set(SOURCES.map(({ reference }) => citationText(reference)));

    expect(wanted).toHaveLength(22);
    expect(
      PAIRS.filter((pair) => !isDeGroot(pair))
        .map(([, to]) => to)
        .sort(),
    ).toEqual(wanted.map(citationText).sort());
    // Precondition: no old key is one the seed builds today, so without the migration the seed would not find the stored row.
    expect(PAIRS.filter(([from]) => today.has(from))).toEqual([]);
    expect(PAIRS).toContainEqual([OLD_KEY, NEW_KEY]);
  });

  it("maps de Groot's volumes IV and VI from the key their files gave before to the key they give today", () => {
    const today = new Set(Object.values(COMPENDIUM.sources).map(citationText));

    expect(PAIRS.filter(isDeGroot).map(([, to]) => to)).toEqual(DE_GROOT_KEYS);
    // Precondition: neither old key is one the seed builds today, so without the migration the seed would not find the stored row.
    expect(PAIRS.filter(isDeGroot).filter(([from]) => today.has(from))).toEqual([]);
    expect(PAIRS).toContainEqual([OLD_V4_KEY, NEW_V4_KEY]);
  });

  it('rewrites a key in place: the row keeps its id and its links', async () => {
    const ingredient = await insertIngredient(
      sql,
      makeIngredient({ name: 'Testwort', variants: [makeVariant({ form: 'Herb' })] }),
      BOOTSTRAP_USER_ID,
    );
    const id = await source(OLD_KEY);
    const link = await insertReferenceLink(sql, ingredient, id, BOOTSTRAP_USER_ID, 'p. 1');

    await run();

    expect(await seedKeyOf(id)).toEqual({ seed_key: NEW_KEY, deleted_at: null });
    const [kept] =
      await sql`select reference_id, deleted_at from reference_links where id = ${link}`;
    expect(kept).toEqual({ reference_id: id, deleted_at: null });
    const [{ count }] = await sql<{ count: string }[]>`select count(*) as count from "references"`;
    expect(Number(count)).toBe(1);
  });

  it('rewrites a soft-deleted row too, so the seed still reads the source as deleted', async () => {
    const id = await source(OLD_KEY, { deleted: true });

    await run();

    const row = await seedKeyOf(id);
    expect(row.seed_key).toBe(NEW_KEY);
    expect(row.deleted_at).not.toBeNull();
  });

  it('leaves the old row alone where a row already holds the new key', async () => {
    const old = await source(OLD_KEY);
    const twin = await source(NEW_KEY);

    await run();

    expect((await seedKeyOf(old)).seed_key).toBe(OLD_KEY);
    expect((await seedKeyOf(twin)).seed_key).toBe(NEW_KEY);
  });

  it("leaves a coven's own source alone", async () => {
    const own = await source(OLD_KEY, { workspace_id: WORKSPACE_W_ID });

    await run();

    expect((await seedKeyOf(own)).seed_key).toBe(OLD_KEY);
  });

  it('runs twice to the same state', async () => {
    const id = await source(OLD_KEY);

    await run();
    await run();

    expect((await seedKeyOf(id)).seed_key).toBe(NEW_KEY);
  });

  it('leaves one volume IV row, scholarly and still cited by jujube, when the seed runs after the migration', async () => {
    const db = drizzle(sql);
    await truncateAllTables(sql);
    await seedCategories(db);
    await seedForms(db);
    await seedAstrology(db);
    await seedDeities(db);
    await seedSources(db);
    await seedCompendium(db, jujubeOnly(), { manifest: null });
    // The row as the seed wrote it from the file before it carried a place, a publisher and the title page's wording.
    const [{ id }] = await sql<{ id: string }[]>`
      update "references" set seed_key = ${OLD_V4_KEY}, place = null, publisher = null, scholarly = false, note = ${OLD_V4.note}
      where workspace_id is null and seed_key = ${NEW_V4_KEY} returning id`;

    await run();
    expect((await seedKeyOf(id)).seed_key).toBe(NEW_V4_KEY);

    await seedCompendium(db, jujubeOnly(), { manifest: null });
    const rows = await sql`
      select id, seed_key, scholarly, place, publisher from "references"
      where workspace_id is null and deleted_at is null and url = ${OLD_V4.url ?? null}`;
    expect(rows).toEqual([
      { id, seed_key: NEW_V4_KEY, scholarly: true, place: 'Leiden', publisher: 'E. J. Brill' },
    ]);
    const cited = await sql`
      select i.name from reference_links l join ingredients i on i.id = l.ingredient_id
      where l.reference_id = ${id} and l.deleted_at is null`;
    expect(cited.map(({ name }) => name)).toContain('Jujube');
  });
});

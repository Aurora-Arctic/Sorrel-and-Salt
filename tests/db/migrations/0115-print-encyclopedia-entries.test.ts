import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { insertReference, insertReferenceLink } from '../../support/db/insert-reference';
import { fromRoot } from '../../support/paths';
import { A } from '../../support/as-user';
import { makeIngredient, makeVariant } from '../../support/fixtures';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { SOURCES } from '@/db/seed/sources';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { citationText } from '@/lib/citation';

// A migration test, retired once `0115` is in production's journal. `0115` rewrites the `seed_key` of the 22 encyclopedia sources
// the vocabulary seed now cites as entries in the print work, so the seed finds each stored row again rather than inserting a twin.
// The test database is already migrated and empty of compendium rows, so the statement runs again over rows each case writes.
// The sources are the real ones, since the migration names their citations.

const FILE = fromRoot('src/db/migrations/0115_print-encyclopedia-entries.sql');
const SQL_TEXT = readFileSync(FILE, 'utf8');
const STATEMENTS = SQL_TEXT.split('--> statement-breakpoint')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

/** The migration's (old key, new key) pairs, as its VALUES list writes them. */
const PAIRS = [...SQL_TEXT.matchAll(/\('((?:[^']|'')*)',\s*'((?:[^']|'')*)'\)/g)].map(
  ([, from, to]) => [from.replace(/''/g, "'"), to.replace(/''/g, "'")] as const,
);

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

describe('0115', () => {
  it('maps an old key to the key the seed builds today for each of the 22 sources', () => {
    const wanted = SOURCES.map(({ reference }) => reference).filter((work) =>
      PRINT_WORKS.includes(work.container ?? ''),
    );
    const today = new Set(SOURCES.map(({ reference }) => citationText(reference)));

    expect(wanted).toHaveLength(22);
    expect(PAIRS.map(([, to]) => to).sort()).toEqual(wanted.map(citationText).sort());
    // Precondition: no old key is one the seed builds today, so without the migration the seed would not find the stored row.
    expect(PAIRS.filter(([from]) => today.has(from))).toEqual([]);
    expect(PAIRS).toContainEqual([OLD_KEY, NEW_KEY]);
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
});

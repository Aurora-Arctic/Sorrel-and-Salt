import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { insertIngredient } from '../../support/db/insert-ingredient';
import {
  insertReference,
  insertReferenceLink,
  insertVariantReferenceLink,
} from '../../support/db/insert-reference';
import { fromRoot } from '../../support/paths';
import { A } from '../../support/as-user';
import { makeIngredient, makeVariant } from '../../support/fixtures';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { citationText } from '@/lib/citation';

// A migration test, retired once `0095` is in production's journal. `0095` rewrites the `seed_key` of every compendium reference-work
// entry stored under the old "s.v." wording, merging it into the row the seed wrote under "under" where there is one.
// The test database is already migrated and empty of compendium rows, so the statements run again over rows each case writes.
// Every title and name is invented.

const FILE = fromRoot('src/db/migrations/0095_rekey-citation-seed-keys.sql');

const STATEMENTS = readFileSync(FILE, 'utf8')
  .split('--> statement-breakpoint')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

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

interface Fields {
  title?: string;
  accessed?: string;
}

/** The fields of a reference-work entry, as the seed stores them. */
const entryFields = ({ title = 'Testwort', accessed }: Fields = {}) => ({
  kind: 'entry' as const,
  title,
  container: 'Fixture Encyclopaedia',
  ...(accessed ? { url: `https://example.org/${title}`, accessed } : {}),
});

/** The key the seed builds for these fields today. */
const newKey = (fields: Fields = {}) => citationText(entryFields(fields));
/** The same key as the old wording wrote it. */
const oldKey = (fields: Fields = {}) => newKey(fields).replace(', under "', ', s.v. "');

/** A compendium (or, with `workspace_id`, a coven's) reference-work entry stored under `seedKey`. */
async function source(
  seedKey: string | null,
  fields: Fields = {},
  extra: { workspace_id?: string; deleted?: boolean; kind?: string } = {},
): Promise<string> {
  const { deleted, ...columns } = extra;
  const id = await insertReference(sql, { ...entryFields(fields), ...columns }, BOOTSTRAP_USER_ID);
  await sql`update "references" set seed_key = ${seedKey} where id = ${id}`;
  if (deleted)
    await sql`update "references" set deleted_at = now(), deleted_by = ${A.id} where id = ${id}`;
  return id;
}

async function entry(name: string): Promise<string> {
  return insertIngredient(
    sql,
    makeIngredient({
      name,
      canonicalName: name.toLowerCase(),
      variants: [makeVariant({ form: 'Herb' })],
    }),
    BOOTSTRAP_USER_ID,
  );
}

async function formOf(ingredientId: string): Promise<string> {
  const [{ id }] = await sql<{ id: string }[]>`
    select id from ingredient_variants where ingredient_id = ${ingredientId}`;
  return id;
}

const referenceRow = async (id: string) => {
  const [row] = await sql<
    { seed_key: string | null; deleted_at: Date | null; deleted_by: string | null }[]
  >`select seed_key, deleted_at, deleted_by from "references" where id = ${id}`;
  return row;
};

/** The live links of `referenceId`, as `owner:locator` strings: `i` for an ingredient, `v` for a form. */
async function liveLinks(referenceId: string): Promise<string[]> {
  const rows = await sql<{ owner: string; locator: string | null }[]>`
    select coalesce('i' || ingredient_id, 'v' || ingredient_variant_id) as owner, locator
    from reference_links where reference_id = ${referenceId} and deleted_at is null`;
  return rows.map((row) => `${row.owner}:${row.locator ?? ''}`).sort();
}

describe('0095', () => {
  it('rewrites a key with no twin in place: the row keeps its id and its links', async () => {
    const ingredient = await entry('Testwort');
    const id = await source(oldKey());
    const link = await insertReferenceLink(sql, ingredient, id, BOOTSTRAP_USER_ID, 'p. 1');

    await run();

    const row = await referenceRow(id);
    expect(row.seed_key).toBe(newKey());
    expect(row.seed_key).not.toContain('s.v.');
    expect(row.deleted_at).toBeNull();
    const [kept] =
      await sql`select reference_id, deleted_at from reference_links where id = ${link}`;
    expect(kept.reference_id).toBe(id);
    expect(kept.deleted_at).toBeNull();
  });

  it('soft-deletes an old row with no links when a twin holds them', async () => {
    const ingredient = await entry('Testwort');
    const old = await source(oldKey());
    const twin = await source(newKey());
    await insertReferenceLink(sql, ingredient, twin, BOOTSTRAP_USER_ID, 'p. 2');

    await run();

    const row = await referenceRow(old);
    expect(row.deleted_at).not.toBeNull();
    expect(row.deleted_by).toBe(BOOTSTRAP_USER_ID);
    expect((await referenceRow(twin)).deleted_at).toBeNull();
    expect(await liveLinks(twin)).toEqual([`i${ingredient}:p. 2`]);
  });

  it('moves the old links to the twin, drops a duplicate, and soft-deletes the old row', async () => {
    const shared = await entry('Testwort');
    const onlyOld = await entry('Samplewort');
    const form = await formOf(onlyOld);
    const old = await source(oldKey());
    const twin = await source(newKey());
    const duplicate = await insertReferenceLink(sql, shared, old, BOOTSTRAP_USER_ID, 'p. 3');
    await insertReferenceLink(sql, onlyOld, old, BOOTSTRAP_USER_ID, 'p. 4');
    await insertVariantReferenceLink(sql, form, old, BOOTSTRAP_USER_ID);
    await insertReferenceLink(sql, shared, twin, BOOTSTRAP_USER_ID, 'p. 5');

    await run();

    expect(await liveLinks(twin)).toEqual(
      [`i${shared}:p. 5`, `i${onlyOld}:p. 4`, `v${form}:`].sort(),
    );
    expect(await liveLinks(old)).toEqual([]);
    const [gone] =
      await sql`select deleted_at, deleted_by from reference_links where id = ${duplicate}`;
    expect(gone.deleted_at).not.toBeNull();
    expect(gone.deleted_by).toBe(BOOTSTRAP_USER_ID);
    expect((await referenceRow(old)).deleted_at).not.toBeNull();
    expect((await referenceRow(twin)).deleted_at).toBeNull();
  });

  it('leaves a link the old row already had deleted deleted', async () => {
    const ingredient = await entry('Testwort');
    const old = await source(oldKey());
    const twin = await source(newKey());
    const link = await insertReferenceLink(sql, ingredient, old, BOOTSTRAP_USER_ID);
    await sql`update reference_links set deleted_at = now(), deleted_by = ${A.id} where id = ${link}`;

    await run();

    const [row] =
      await sql`select reference_id, deleted_by from reference_links where id = ${link}`;
    expect(row.reference_id).toBe(old);
    expect(row.deleted_by).toBe(A.id);
    expect(await liveLinks(twin)).toEqual([]);
  });

  it('treats two sources of one title with different access days as different, and keeps both', async () => {
    const first = await source(oldKey({ accessed: '2026-01-02' }), { accessed: '2026-01-02' });
    const second = await source(oldKey({ accessed: '2026-03-04' }), { accessed: '2026-03-04' });

    await run();

    expect((await referenceRow(first)).seed_key).toBe(newKey({ accessed: '2026-01-02' }));
    expect((await referenceRow(second)).seed_key).toBe(newKey({ accessed: '2026-03-04' }));
    expect((await referenceRow(first)).deleted_at).toBeNull();
    expect((await referenceRow(second)).deleted_at).toBeNull();
  });

  it('does not treat a deleted row as a twin: the old row is rewritten in place', async () => {
    const old = await source(oldKey());
    const dead = await source(newKey(), {}, { deleted: true });

    await run();

    expect((await referenceRow(old)).seed_key).toBe(newKey());
    expect((await referenceRow(old)).deleted_at).toBeNull();
    expect((await referenceRow(dead)).deleted_at).not.toBeNull();
  });

  it("leaves a coven's own source, a deleted old row and a key that is not a reference-work entry alone", async () => {
    const own = await source(oldKey(), {}, { workspace_id: WORKSPACE_W_ID });
    const deleted = await source(
      oldKey({ title: 'Samplewort' }),
      { title: 'Samplewort' },
      { deleted: true },
    );
    const book = await insertReference(
      sql,
      { kind: 'book', title: 'A Herbal, s.v. "Fixture"' },
      BOOTSTRAP_USER_ID,
    );
    await sql`update "references" set seed_key = 'A Herbal, s.v. "Fixture"' where id = ${book}`;

    await run();

    expect((await referenceRow(own)).seed_key).toBe(oldKey());
    expect((await referenceRow(deleted)).seed_key).toBe(oldKey({ title: 'Samplewort' }));
    expect((await referenceRow(book)).seed_key).toBe('A Herbal, s.v. "Fixture"');
  });

  it('runs twice to the same state', async () => {
    const ingredient = await entry('Testwort');
    const old = await source(oldKey());
    const twin = await source(newKey());
    await insertReferenceLink(sql, ingredient, old, BOOTSTRAP_USER_ID, 'p. 6');

    await run();
    const once = await sql`select to_jsonb(t)::text as r from reference_links t order by id`;
    await run();

    expect(await sql`select to_jsonb(t)::text as r from reference_links t order by id`).toEqual(
      once,
    );
    expect(await liveLinks(twin)).toEqual([`i${ingredient}:p. 6`]);
    expect((await referenceRow(old)).deleted_at).not.toBeNull();
  });

  it('leaves no live source with the old wording', async () => {
    await source(oldKey());
    await source(oldKey({ title: 'Samplewort' }), { title: 'Samplewort' });
    await source(newKey({ title: 'Samplewort' }), { title: 'Samplewort' });

    await run();

    const [{ count }] = await sql<{ count: string }[]>`
      select count(*) as count from "references"
      where workspace_id is null and deleted_at is null and seed_key like '%, s.v. %'`;
    expect(Number(count)).toBe(0);
  });
});

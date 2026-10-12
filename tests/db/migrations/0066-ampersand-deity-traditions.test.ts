import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { fromRoot } from '../../support/paths';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { FIXTURE_USERS } from '@/db/seed/standard';

// Rule 7 (claude-docs/testing/layer-ownership.md, "What a test may assert"):
// a migration data test, retired once `0066` is in production's journal. It
// re-runs the migration's own rename, read off disk, against the seeded
// traditions put back under their old names, as the migration meets them.

const RENAME = readFileSync(
  fromRoot('src/db/migrations/0066_ampersand-deity-traditions.sql'),
  'utf8',
)
  .replace(/^\s*--.*$/gm, '')
  .trim();

/** The five seed keys, with the name each held before and holds after. */
const RENAMED: [key: string, old: string, now: string][] = [
  ['akkadian-and-babylonian', 'Akkadian and Babylonian', 'Akkadian & Babylonian'],
  ['canaanite-and-phoenician', 'Canaanite and Phoenician', 'Canaanite & Phoenician'],
  [
    'anglo-saxon-and-continental-germanic',
    'Anglo-Saxon and Continental Germanic',
    'Anglo-Saxon & Continental Germanic',
  ],
  ['gaulish-and-british', 'Gaulish and British', 'Gaulish & British'],
  ['fon-and-ewe', 'Fon and Ewe', 'Fon & Ewe'],
];
const KEYS = RENAMED.map(([key]) => key);

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

const traditions = async () =>
  (
    await sql`
      select seed_key, name, slug, updated_by from deity_traditions
      where seed_key in ${sql(KEYS)} order by seed_key
    `
  ).map((row) => ({ ...row }));

beforeEach(async () => {
  for (const [key, old] of RENAMED) {
    await sql`
      update deity_traditions set name = ${old}, deleted_at = null, deleted_by = null,
        updated_by = ${FIXTURE_USERS.E.id}
      where seed_key = ${key}
    `;
  }
  // Precondition: all five are the seed's live rows, under the old names.
  expect(Object.fromEntries((await traditions()).map((row) => [row.seed_key, row.name]))).toEqual(
    Object.fromEntries(RENAMED.map(([key, old]) => [key, old])),
  );
});

describe('0066: the ampersand rename', () => {
  it('renames each seeded tradition still under its old name, keeping its slug', async () => {
    const before = await traditions();

    await sql.unsafe(RENAME);

    const after = await traditions();
    expect(Object.fromEntries(after.map((row) => [row.seed_key, row.name]))).toEqual(
      Object.fromEntries(RENAMED.map(([key, , now]) => [key, now])),
    );
    expect(after.map((row) => row.slug)).toEqual(before.map((row) => row.slug));
    expect(after.every((row) => row.updated_by === BOOTSTRAP_USER_ID)).toBe(true);
  });

  it('leaves a tradition an admin renamed, and a removed one, as they are', async () => {
    await sql`update deity_traditions set name = 'Vodun of Dahomey' where seed_key = 'fon-and-ewe'`;
    await sql`
      update deity_traditions set deleted_at = now(), deleted_by = ${FIXTURE_USERS.E.id}
      where seed_key = 'gaulish-and-british'
    `;

    await sql.unsafe(RENAME);

    const names = Object.fromEntries((await traditions()).map((row) => [row.seed_key, row.name]));
    expect(names['fon-and-ewe']).toBe('Vodun of Dahomey');
    expect(names['gaulish-and-british']).toBe('Gaulish and British');
    // The other three are the seed's still, so the rename did run.
    expect(names['akkadian-and-babylonian']).toBe('Akkadian & Babylonian');
  });
});

import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { fromRoot } from '../../support/paths';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { FIXTURE_USERS } from '@/db/seed/standard';

// Rule 7 (claude-docs/testing/layer-ownership.md, "What a test may assert"):
// a migration data test, retired once `0077` is in production's journal. It
// re-runs the backfill, read off disk, against the seeded groups with their
// glyphs put back to NULL, as the migration meets them straight after `0076`
// adds the column. That an admin's cleared glyph survives a reseed is
// tests/db/seed/forms.test.ts's: this backfill runs once, before any admin
// could clear one, and cannot tell a cleared glyph from one never set.

const migration = (file: string) =>
  readFileSync(fromRoot('src/db/migrations', file), 'utf8')
    .replace(/^\s*--.*$/gm, '')
    .trim();

const ADD_COLUMN = migration('0076_form-group-icon.sql');
const BACKFILL = migration('0077_backfill-form-group-icons.sql');

/** The six seed keys, each with the glyph the backfill gives it. */
const GLYPHS: Record<string, string> = {
  botanical: 'botanical',
  animal: 'animal',
  mineral: 'mineral',
  substance: 'substance',
  fluid: 'fluid',
  curio: 'curio',
};
const KEYS = Object.keys(GLYPHS);

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

type Glyph = { icon: string | null; updated_by: string };

/** Each seeded group's glyph and last writer, by seed key. */
const groups = async (): Promise<Record<string, Glyph>> =>
  Object.fromEntries(
    (
      await sql<(Glyph & { seed_key: string })[]>`
        select seed_key, icon, updated_by from ingredient_form_groups
        where seed_key in ${sql(KEYS)}
      `
    ).map(({ seed_key, ...row }) => [seed_key, row]),
  );

beforeEach(async () => {
  await sql`
    update ingredient_form_groups set icon = null, deleted_at = null, deleted_by = null,
      updated_by = ${FIXTURE_USERS.E.id}
    where seed_key in ${sql(KEYS)}
  `;
  // Precondition: all six are the seed's live rows, each still without a glyph.
  const before = await groups();
  expect(Object.keys(before).sort()).toEqual([...KEYS].sort());
  expect(Object.values(before).every((row) => row.icon === null)).toBe(true);
});

describe('0077: the form group glyph backfill', () => {
  it('gives each seeded group its glyph by seed key, stamped as the seed’s', async () => {
    await sql.unsafe(BACKFILL);

    expect(await groups()).toEqual(
      Object.fromEntries(
        KEYS.map((key) => [key, { icon: GLYPHS[key], updated_by: BOOTSTRAP_USER_ID }]),
      ),
    );
  });

  it('leaves a glyph an admin chose, and a removed group, as they are', async () => {
    await sql`
      update ingredient_form_groups set icon = 'fluid', updated_by = ${FIXTURE_USERS.E.id}
      where seed_key = 'mineral'
    `;
    await sql`
      update ingredient_form_groups set deleted_at = now(), deleted_by = ${FIXTURE_USERS.E.id}
      where seed_key = 'curio'
    `;

    await sql.unsafe(BACKFILL);

    const after = await groups();
    expect(after.mineral).toEqual({ icon: 'fluid', updated_by: FIXTURE_USERS.E.id });
    expect(after.curio).toEqual({ icon: null, updated_by: FIXTURE_USERS.E.id });
    // The other four are the seed's still, so the backfill did run.
    expect(after.botanical).toEqual({ icon: 'botanical', updated_by: BOOTSTRAP_USER_ID });
  });

  // drizzle-kit runs every pending migration in one transaction, where a type
  // created is usable at once: the refusal `0072` works around belongs to a
  // value added by `ALTER TYPE … ADD VALUE`, never to `CREATE TYPE`.
  it('applies with 0076 in one transaction, on a database without the column', async () => {
    const icons = await sql.begin(async (tx) => {
      await tx.unsafe(
        'ALTER TABLE ingredient_form_groups DROP COLUMN icon; DROP TYPE form_group_icon;',
      );
      await tx.unsafe(ADD_COLUMN);
      await tx.unsafe(BACKFILL);
      // Unprepared, and as text: the column's type is a new one now, which a
      // plan prepared over the old would refuse ("cached plan must not change
      // result type").
      return tx.unsafe<{ seed_key: string; icon: string }[]>(
        'select seed_key, icon::text as icon from ingredient_form_groups where seed_key = any($1)',
        [KEYS],
        { prepare: false },
      );
    });

    expect(Object.fromEntries(icons.map((row) => [row.seed_key, row.icon]))).toEqual(GLYPHS);
  });
});

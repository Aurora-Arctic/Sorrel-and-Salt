import { existsSync, readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { fromRoot } from '../../support/paths';
import { FIXTURE_USERS } from '@/db/seed/standard';

// A migration test, retired once `0089` is in production's journal. `0089` is the contract half of the step column renames: it refills `position` from `layer_order` where they differ (the previous deploy kept writing `layer_order` alone),
// sets `position` NOT NULL, then drops the `spell_ingredients` view, `layer_order`, `instructions` and the retired `note`. The columns are already gone, so the refill runs over a scratch table built like the old one and the drops are proved by the catalogue.

const FILE = fromRoot('src/db/migrations/0089_drop-spell-steps-old-columns.sql');

const STATEMENTS = existsSync(FILE)
  ? readFileSync(FILE, 'utf8')
      .split('--> statement-breakpoint')
      .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
      .filter(Boolean)
  : [];

const REFILL = STATEMENTS.filter((statement) => /^UPDATE\s+"spell_steps"/i.test(statement));

const AUTHOR = FIXTURE_USERS.A.id;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

beforeEach(async () => {
  await sql`drop table if exists scratch_steps`;
});

/** A table shaped like `spell_steps` before the drops: both columns and a live-only unique index on each, so the refill meets the clash it must avoid. */
async function oldShape(rows: [string, number | null, number, boolean][]) {
  await sql`create table scratch_steps (
    id serial primary key, spell_id uuid not null, name text not null,
    position integer, layer_order integer not null, deleted_at timestamptz)`;
  await sql`create unique index scratch_position on scratch_steps (spell_id, position)
    where deleted_at is null`;
  await sql`create unique index scratch_layer on scratch_steps (spell_id, layer_order)
    where deleted_at is null`;
  const spell = AUTHOR; // any uuid will do; no foreign key on the scratch table
  for (const [name, position, layerOrder, removed] of rows) {
    await sql`insert into scratch_steps (spell_id, name, position, layer_order, deleted_at)
      values (${spell}, ${name}, ${position}, ${layerOrder}, ${removed ? new Date() : null})`;
  }
}

const run = async () => {
  for (const statement of REFILL) {
    await sql.unsafe(statement.split('"spell_steps"').join('scratch_steps'));
  }
};

describe('0089 refill', () => {
  it('writes the refill as updates of spell_steps', () => {
    expect(REFILL.length).toBeGreaterThan(0);
  });

  it('ends with position = layer_order on a row where they differed, a swap included', async () => {
    await oldShape([
      ['A', 1, 2, false], // the old deploy swapped A and B by layer_order alone
      ['B', 2, 1, false],
      ['C', null, 3, false], // added by the old deploy: no position
      ['D', 4, 4, false], // already equal
      ['E', 9, 5, true], // removed, and differing
    ]);

    await run();

    const rows = await sql`select name, position, layer_order from scratch_steps order by name`;
    for (const row of rows) expect(row.position).toBe(row.layer_order);
  });
});

describe('0089 on the migrated database', () => {
  it('drops the view, the old columns and the old index, and makes position NOT NULL', async () => {
    const views = await sql`select 1 from information_schema.views
      where table_schema = 'public' and table_name = 'spell_ingredients'`;
    expect(views).toHaveLength(0);

    const columns = await sql`select table_name, column_name, is_nullable
      from information_schema.columns where table_schema = 'public'
        and ((table_name = 'spell_steps' and column_name in ('layer_order', 'note', 'position'))
          or (table_name = 'spells' and column_name = 'instructions'))`;
    expect(columns.map((c) => [c.table_name, c.column_name, c.is_nullable])).toEqual([
      ['spell_steps', 'position', 'NO'],
    ]);

    const indexes = await sql`select 1 from pg_indexes where schemaname = 'public'
      and indexname = 'spell_steps_spell_id_layer_order_unique'`;
    expect(indexes).toHaveLength(0);
  });
});

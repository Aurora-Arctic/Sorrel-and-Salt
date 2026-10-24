import { existsSync, readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { fromRoot } from '../../support/paths';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';

// Rule 7 (claude-docs/testing/layer-ownership.md, "What a test may assert"):
// a migration test, retired once `0083` is in production's journal. `0083`
// fills `position` from `layer_order` and `spells.note` from `instructions`,
// and leaves a `spell_ingredients` view for the deploy before it. The test
// database is migrated with no spells in it, so each case writes the rows the
// deploy before would have, through the view, and runs `0083`'s fill
// statements over them.

const FILE = fromRoot('src/db/migrations/0083_spell-steps-expand.sql');

/** `0083`'s `UPDATE` statements, comment lines stripped, as the migrator splits them. */
const FILLS = existsSync(FILE)
  ? readFileSync(FILE, 'utf8')
      .split('--> statement-breakpoint')
      .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
      .filter((statement) => statement.startsWith('UPDATE'))
  : [];

const AUTHOR = FIXTURE_USERS.A.id;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

beforeEach(async () => {
  await sql`truncate spells cascade`;
});

/** A spell and its two layers as the deploy before writes them: the old columns alone, through the view. */
async function writtenByTheDeployBefore(instructions: string | null): Promise<string> {
  const [spell] = await sql`
    insert into spells (workspace_id, title, instructions, created_by, updated_by)
    values (${WORKSPACE_W_ID}, 'Testwort Ward', ${instructions}, ${AUTHOR}, ${AUTHOR})
    returning id`;
  for (const [layerOrder, name] of [
    [1, 'Testwort'],
    [2, 'Otherwort'],
  ] as const) {
    await sql`
      insert into spell_ingredients (spell_id, name, layer_order, created_by, updated_by)
      values (${spell.id}, ${name}, ${layerOrder}, ${AUTHOR}, ${AUTHOR})`;
  }
  return spell.id as string;
}

describe('0083 on rows the deploy before wrote', () => {
  it('fills each step’s position from its layer order', async () => {
    const spellId = await writtenByTheDeployBefore(null);
    // Why the fill is what sets it: the view's insert left it null.
    const before = await sql`select position from spell_steps where spell_id = ${spellId}`;
    expect(before.map((row) => row.position)).toEqual([null, null]);
    expect(FILLS).toHaveLength(2);

    for (const statement of FILLS) await sql.unsafe(statement);

    const after = await sql`
      select name, position, layer_order from spell_steps
      where spell_id = ${spellId} order by layer_order`;
    expect(after.map((row) => [row.name, row.position])).toEqual([
      ['Testwort', 1],
      ['Otherwort', 2],
    ]);
  });

  it('fills a spell’s note from its instructions, and leaves a spell without them alone', async () => {
    const withInstructions = await writtenByTheDeployBefore('Bury it by the gate.');
    const without = await writtenByTheDeployBefore(null);

    for (const statement of FILLS) await sql.unsafe(statement);

    const rows = await sql`
      select id, note from spells where id in ${sql([withInstructions, without])}`;
    const noteOf = new Map(rows.map((row) => [row.id as string, row.note]));
    expect(noteOf.get(withInstructions)).toBe('Bury it by the gate.');
    expect(noteOf.get(without)).toBeNull();
  });

  // Made after the `ADD COLUMN`s, so `SELECT *` carried the new columns into
  // it: the deploy that writes both reads the same rows through either name.
  it('leaves a view that carries position and body', async () => {
    const columns = await sql`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'spell_ingredients'`;
    const names = columns.map((row) => row.column_name as string);

    expect(names).toEqual(expect.arrayContaining(['position', 'body', 'layer_order']));
  });
});

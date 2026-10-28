import { existsSync, readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { fromRoot } from '../../support/paths';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';

// A migration test, retired once `0088` is in production's journal. `0088`
// copies each live step's `note` into its `body`, because the note is retired
// (claude-docs/design-decisions/pr1308-step-note-retired.md). The column and
// its values stay for the later drop. The test database is migrated with no
// spells in it, so each case writes the rows the old code would have, and runs
// `0088`'s `UPDATE` over them.

const FILE = fromRoot('src/db/migrations/0088_spell-steps-note-into-body.sql');

const COPY = existsSync(FILE)
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

/** One spell with a step per case, as the old code wrote them. */
async function written(): Promise<void> {
  const [spell] = await sql`
    insert into spells (workspace_id, title, created_by, updated_by)
    values (${WORKSPACE_W_ID}, 'Testwort Ward', ${AUTHOR}, ${AUTHOR})
    returning id`;
  const rows = [
    ['Noteonly', null, 'Keep it dry.', null],
    ['Bodyonly', 'Crush it.', null, null],
    ['Both', 'Crush it.', 'Keep it dry.', null],
    ['Neither', null, null, null],
    ['Removed', null, 'Gone.', new Date()],
  ] as const;
  let place = 0;
  for (const [name, body, note, deletedAt] of rows) {
    place += 1;
    await sql`
      insert into spell_steps (spell_id, name, body, note, position, layer_order, deleted_at,
        created_by, updated_by)
      values (${spell.id}, ${name}, ${body}, ${note}, ${place}, ${place}, ${deletedAt},
        ${AUTHOR}, ${AUTHOR})`;
  }
}

const bodies = async () =>
  new Map(
    (await sql`select name, body, note from spell_steps`).map((row) => [
      row.name as string,
      { body: row.body as string | null, note: row.note as string | null },
    ]),
  );

describe('0088 on steps the old code wrote', () => {
  it('moves a note into the body, joins it after an existing body, and leaves the note in place', async () => {
    await written();
    expect(COPY).toHaveLength(1);

    for (const statement of COPY) await sql.unsafe(statement);

    const after = await bodies();
    expect(after.get('Noteonly')).toEqual({ body: 'Keep it dry.', note: 'Keep it dry.' });
    expect(after.get('Bodyonly')).toEqual({ body: 'Crush it.', note: null });
    expect(after.get('Both')).toEqual({ body: 'Crush it.\n\nKeep it dry.', note: 'Keep it dry.' });
    expect(after.get('Neither')).toEqual({ body: null, note: null });
  });

  it('leaves a removed step as it was', async () => {
    await written();

    for (const statement of COPY) await sql.unsafe(statement);

    expect((await bodies()).get('Removed')).toEqual({ body: null, note: 'Gone.' });
  });
});

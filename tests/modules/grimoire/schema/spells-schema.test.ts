import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { type SpellOverrides, makeSpell, spellColumns } from '../../../support/fixtures';
import { spellStatus, spellVisibility, spells } from '@/modules/grimoire/schema/spells';
import { FIXTURE_USERS, WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';

// §5's columns, `visibility` included as of M10.3 — claude-docs/db/grimoire.md,
// "The grimoire".
const OWN_COLUMNS = [
  'id',
  'workspace_id',
  'title',
  'intent',
  'jar_size',
  'seal_wax_color',
  'moon_phase',
  'day_of_week',
  'instructions',
  'status',
  'visibility',
];

describe('spells schema', () => {
  const { byName } = tableFacts(spells);

  // The full six: story 54's delete is recoverable. Only two join tables take four (MB.34).
  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });
});

const AUTHOR = FIXTURE_USERS.A.id;
const COVEN = WORKSPACE_W_ID;
const OTHER_COVEN = WORKSPACE_X_ID;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

// The factory writes the row; this file supplies the coven and the author.
// `status` and `visibility` are dropped so each column's own default is what
// the tests observe — a value spelled out in the insert would make "defaults
// to draft" assert what it just wrote. `cast` and `share` take those paths.
async function record(overrides: SpellOverrides = {}): Promise<string> {
  const {
    status: _status,
    visibility: _visibility,
    ...columns
  } = spellColumns(makeSpell({ workspaceId: COVEN, ...overrides }));

  const [inserted] = await sql`
    insert into spells ${sql({ ...columns, created_by: AUTHOR, updated_by: AUTHOR })}
    returning id
  `;
  return inserted.id as string;
}

async function cast(status: string): Promise<string> {
  const [inserted] = await sql`
    insert into spells (workspace_id, title, status, created_by, updated_by)
    values (${COVEN}, 'Hearth Guard', ${status}::spell_status, ${AUTHOR}, ${AUTHOR})
    returning id
  `;
  return inserted.id as string;
}

async function share(visibility: string | null): Promise<string> {
  const [inserted] = await sql`
    insert into spells (workspace_id, title, visibility, created_by, updated_by)
    values (${COVEN}, 'Hearth Guard', ${visibility}::spell_visibility, ${AUTHOR}, ${AUTHOR})
    returning id
  `;
  return inserted.id as string;
}

beforeEach(async () => {
  await sql`truncate spells cascade`;
});

describe('spells table', () => {
  // What §8's example writes, and so the least a spell can be.
  it('accepts a spell that is only a title in a workspace', async () => {
    const id = await record({ title: 'Hearth Guard' });

    const [row] = await sql`select * from spells where id = ${id}`;

    expect(row.title).toBe('Hearth Guard');
    for (const column of [
      'intent',
      'jar_size',
      'seal_wax_color',
      'moon_phase',
      'day_of_week',
      'instructions',
    ]) {
      expect(row[column]).toBeNull();
    }
  });

  // A title identifies nothing: neither the coven nor the title is unique.
  it('lets one workspace hold two spells with the same title, and another workspace a third', async () => {
    await record();
    await record();
    await record({ workspaceId: OTHER_COVEN });

    const [{ count }] = await sql`select count(*)::int as count from spells`;
    expect(count).toBe(3);
  });

  // In the column rather than the service, so a spell written by any path is
  // a draft until something says otherwise.
  it('defaults a new spell to draft', async () => {
    const id = await record();

    const [row] = await sql`select status::text from spells where id = ${id}`;

    expect(row.status).toBe('draft');
  });

  // In the column, so a spell written by any path — a seed, a fixture, a
  // service that never mentions visibility — joins the shared grimoire
  // rather than disappearing into its author's (M10.3).
  it('defaults a new spell to workspace visibility', async () => {
    const id = await record();

    const [row] = await sql`select visibility::text from spells where id = ${id}`;

    expect(row.visibility).toBe('workspace');
  });

  // Exactly two of each in v1; v2's `proposed`/`approved` and §13's
  // `public` are an `ALTER TYPE ... ADD VALUE`, which is why each is an enum.
  it('holds the statuses and visibilities the code declares', async () => {
    const [row] = await sql`
      select enum_range(null::spell_status)::text[] as statuses,
             enum_range(null::spell_visibility)::text[] as visibilities
    `;

    expect(row.statuses).toEqual(spellStatus.enumValues);
    expect(row.visibilities).toEqual(spellVisibility.enumValues);
  });

  it('refuses a status or a visibility outside its two', async () => {
    const status = await failureOf(cast('proposed'));
    const visibility = await failureOf(share('public'));

    // 22P02 is invalid_text_representation — the enum refusing the cast.
    expect(status.code).toBe('22P02');
    expect(visibility.code).toBe('22P02');
  });
});

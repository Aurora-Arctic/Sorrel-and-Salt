import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { type SpellOverrides, makeSpell, spellColumns } from '../support/fixtures';
import { spellStatus, spells } from '@/db/schema/spells';
import { users } from '@/db/schema/users';
import { workspaces } from '@/db/schema/workspaces';
import { FIXTURE_USERS, WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';

// The full six. A spell is a workspace's record of a working, and story 54
// deletes one — recoverably, like every other content table. Only the three
// join tables take the four-column spread (MB.34).
const AUDIT_COLUMNS = [
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
  'deleted_at',
  'deleted_by',
];

// DESIGN.md §5's column list, transcribed — minus `visibility`, which is
// M10.3's column and lands in Wave 5 with the service rule that reads it. The
// split is deliberate (TASKS.md, "Breaking the M1.23 ↔ M10.3 cycle"): M1.23
// seeds spells against this table, and M10.3's "existing seeded spells migrate
// to workspace visibility" is only testable if there are seeded rows first.
// This list failing is the reminder that adding the column here would quietly
// take that criterion away.
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
];

const WORKSPACE_FK = 'spells_workspace_id_workspaces_id_fk';

describe('spells schema', () => {
  const { columns, indexes, checks, foreignKeys } = getTableConfig(spells);
  const byName = Object.fromEntries(columns.map((column) => [column.name, column]));
  const foreignKeyByColumn = Object.fromEntries(
    foreignKeys.map((fk) => {
      const { columns: local, foreignColumns, foreignTable } = fk.reference();
      return [
        local[0].name,
        { name: fk.getName(), foreignColumnName: foreignColumns[0].name, foreignTable },
      ];
    }),
  );

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  it('does not carry M10.3’s visibility column yet', () => {
    expect(byName.visibility).toBeUndefined();
  });

  it('carries a surrogate id as its primary key', () => {
    expect(byName.id.primary).toBe(true);
    expect(byName.id.hasDefault).toBe(true);
  });

  it('requires the workspace the spell belongs to, and its title', () => {
    expect(byName.workspace_id.notNull).toBe(true);
    expect(byName.title.notNull).toBe(true);
  });

  // §8's own example creates a spell with a workspace and a title and nothing
  // else: `spells.create(asUser(A), { workspaceId: W.id, title: 'x' })`. A
  // draft is the state a spell is saved in *before* it is finished (M10.20),
  // so every field describing the working has to be omittable.
  it('leaves every field a draft has not filled in yet nullable', () => {
    for (const column of [
      'intent',
      'jar_size',
      'seal_wax_color',
      'moon_phase',
      'day_of_week',
      'instructions',
    ]) {
      expect(byName[column].notNull).toBe(false);
    }
  });

  it('requires a status and defaults it to draft (M10.20)', () => {
    expect(byName.status.notNull).toBe(true);
    expect(byName.status.hasDefault).toBe(true);
  });

  it('points at the workspace whose grimoire holds it', () => {
    expect(foreignKeyByColumn.workspace_id.foreignTable).toBe(workspaces);
    expect(foreignKeyByColumn.workspace_id.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.workspace_id.name).toBe(WORKSPACE_FK);
  });

  it('spreads the six audit columns, the four stamps required', () => {
    for (const column of AUDIT_COLUMNS) {
      expect(byName[column]).toBeDefined();
    }
    for (const column of ['created_at', 'created_by', 'updated_at', 'updated_by']) {
      expect(byName[column].notNull).toBe(true);
    }
    expect(byName.deleted_at.notNull).toBe(false);
    expect(byName.deleted_by.notNull).toBe(false);
  });

  it('references users.id from every audit id (MB.5)', () => {
    for (const column of ['created_by', 'updated_by', 'deleted_by']) {
      expect(foreignKeyByColumn[column]).toBeDefined();
      expect(foreignKeyByColumn[column].foreignColumnName).toBe('id');
      expect(foreignKeyByColumn[column].foreignTable).toBe(users);
    }
  });

  // §5 names no index and no CHECK on this table, and the rule against hooks
  // the design doc does not name applies to both. The grimoire's own lookups
  // are M10.9's, and a spell title is not unique — two workings may share a
  // name in the same coven.
  it('declares no index and no check of its own', () => {
    expect(indexes).toEqual([]);
    expect(checks).toEqual([]);
  });

  it('stocks the status enum with §5’s two values, in order', () => {
    expect(spellStatus.enumValues).toEqual(['draft', 'complete']);
  });
});

// The behaviour half, against the real table. This worker's sorrel_test_<n>
// clone arrives with every migration applied and the `standard` scenario
// seeded (M1.27, tests/support/db-setup.ts), and re-cloned that way before
// this file runs — so what is asserted below is the SQL production runs, with
// no schema built here and nothing to put back afterwards. Until M1.27 the
// template was empty: this file applied the one migration that ships the
// table and stubbed `users`, `workspaces` and `ingredients` to a bare `id`
// column.
//
// The author and the two covens are the seed's, not invented ids: the real
// `users` and `workspaces` have NOT NULL names, slugs and audit stamps, and a
// row that exists is cheaper to point at than one to construct. Bound to the
// old names so the tests read as they did.
const AUTHOR = FIXTURE_USERS.A.id;
const COVEN = WORKSPACE_W_ID;
const OTHER_COVEN = WORKSPACE_X_ID;
const ABSENT = '99999999-9999-9999-9999-999999999999';

let sql: ReturnType<typeof postgres>;

// M1.25 — the shared factory writes the row; this file supplies the coven and
// the author, since the audit stamps are never the fixture's to give
// (CLAUDE.md rule 3) and which of the seed's two covens holds the spell is
// what several tests below are about.
//
// Every column §5 names except `status`, which is dropped so that the column's
// own default is what the tests below observe — a status spelled out in the
// insert would make "defaults a new spell to draft" assert the value it had
// just written. `cast` takes the status path when a test is about the enum
// itself.
async function record(overrides: SpellOverrides = {}): Promise<string> {
  const { status: _status, ...columns } = spellColumns(
    makeSpell({ workspaceId: COVEN, ...overrides }),
  );

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

async function failureOf(work: Promise<unknown>) {
  return await work.then(
    () => {
      throw new Error('expected the statement to be rejected, but it succeeded');
    },
    (error: postgres.PostgresError) => error,
  );
}

async function columnNames(table: string): Promise<string[]> {
  const rows = await sql`
    select column_name from information_schema.columns
    where table_name = ${table} order by column_name
  `;
  return rows.map((row) => row.column_name as string);
}

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

// `truncate … cascade` rather than `delete from`: `spell_ingredients` and
// `spell_categories` both hang off this table under NO ACTION keys, and the
// cascade takes any of their rows with it. The empty table is what every test
// below assumes.
beforeEach(async () => {
  await sql`truncate spells cascade`;
});

afterAll(async () => {
  await sql.end();
});

describe('spells table', () => {
  it('carries §5’s columns beside the six audit ones', async () => {
    expect(await columnNames('spells')).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  // What §8's acceptance example writes, and therefore the least a spell can
  // be: a coven, a name, and the audit stamps. Everything else about the
  // working is still unanswered.
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

  it('stores every field §5 names on the row', async () => {
    const id = await record({
      intent: 'Guard the threshold',
      jarSize: '4 oz',
      sealWaxColor: 'oxblood',
      moonPhase: 'waning gibbous',
      dayOfWeek: 'Saturday',
      instructions: 'Layer, seal, set on the sill.',
    });

    const [row] = await sql`select * from spells where id = ${id}`;

    expect(row.intent).toBe('Guard the threshold');
    expect(row.jar_size).toBe('4 oz');
    expect(row.seal_wax_color).toBe('oxblood');
    expect(row.moon_phase).toBe('waning gibbous');
    expect(row.day_of_week).toBe('Saturday');
    expect(row.instructions).toBe('Layer, seal, set on the sill.');
  });

  it('refuses a spell with no title', async () => {
    // 23502 is not_null_violation, named: the refusal is the column's and not
    // a foreign key's or a type cast's.
    // Cast, because the fixture is typed against a NOT NULL column and the
    // whole point of this row is the absence the column refuses — which has to
    // be Postgres's refusal rather than TypeScript's.
    const error = await failureOf(record({ title: null as unknown as string }));

    expect(error.code).toBe('23502');
    expect(error.column_name).toBe('title');
  });

  it('refuses a spell in a workspace that does not exist', async () => {
    const error = await failureOf(record({ workspaceId: ABSENT }));

    // 23503 is foreign_key_violation.
    expect(error.code).toBe('23503');
    expect(error.constraint_name).toBe(WORKSPACE_FK);
  });

  // Why the two refusals above could have succeeded: neither the title nor the
  // workspace is unique or otherwise constrained, so a coven may record two
  // workings under one name and two covens may each record their own.
  it('lets one workspace hold two spells with the same title', async () => {
    await record();

    await expect(record()).resolves.toBeDefined();
  });

  it('lets two workspaces each hold a spell of the same name', async () => {
    await record();

    await expect(record({ workspaceId: OTHER_COVEN })).resolves.toBeDefined();
  });

  describe('status', () => {
    // M10.20: "New spells default to draft". In the column rather than in the
    // service, so a spell written by any path is a draft until something says
    // otherwise — an unfinished spell mistaken for a finished one is the
    // failure the story names.
    it('defaults a new spell to draft', async () => {
      const id = await record();

      const [row] = await sql`select status::text from spells where id = ${id}`;

      expect(row.status).toBe('draft');
    });

    for (const status of ['draft', 'complete']) {
      it(`stores ${status}`, async () => {
        const id = await cast(status);

        const [row] = await sql`select status::text from spells where id = ${id}`;

        expect(row.status).toBe(status);
      });
    }

    // The acceptance criterion — "status accepts only draft and complete in
    // v1" — against the shipped type. §13's viewer-approval workflow adds
    // `proposed` and `approved` in v2, which is an `ALTER TYPE ... ADD VALUE`
    // rather than a rewrite, and is exactly why this is an enum.
    it('holds exactly the two labels and no more', async () => {
      const [row] = await sql`select enum_range(null::spell_status)::text[] as labels`;

      expect(row.labels).toEqual(['draft', 'complete']);
    });

    it('refuses a status outside the two', async () => {
      // 22P02 is invalid_text_representation — the enum refusing the cast.
      const error = await failureOf(cast('proposed'));

      expect(error.code).toBe('22P02');
    });

    it('refuses a null status', async () => {
      const error = await failureOf(
        sql`
          insert into spells (workspace_id, title, status, created_by, updated_by)
          values (${COVEN}, 'Hearth Guard', null, ${AUTHOR}, ${AUTHOR})
        `,
      );

      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('status');
    });
  });

  // Rule 4: a spell is soft-deleted like every other content table, and story
  // 54's delete is recoverable. There is no unique index to dodge here, which
  // is why the tombstone costs nothing — the name was never reserved.
  it('soft-deletes, leaving the row and its title behind', async () => {
    const id = await record({ title: 'Hearth Guard' });

    await sql`update spells set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${id}`;

    const [row] = await sql`select title, deleted_at, deleted_by from spells where id = ${id}`;
    expect(row.title).toBe('Hearth Guard');
    expect(row.deleted_at).not.toBeNull();
    expect(row.deleted_by).toBe(AUTHOR);
  });

  it('declares no index beyond the primary key’s', async () => {
    const rows = await sql`
      select c.relname as name
      from pg_index i
      join pg_class c on c.oid = i.indexrelid
      where i.indrelid = 'spells'::regclass
    `;

    expect(rows.map((row) => row.name)).toEqual(['spells_pkey']);
  });

  it('declares no check constraint of its own', async () => {
    const rows = await sql`
      select conname from pg_constraint
      where conrelid = 'spells'::regclass and contype = 'c'
    `;

    expect(rows.map((row) => row.conname)).toEqual([]);
  });
});

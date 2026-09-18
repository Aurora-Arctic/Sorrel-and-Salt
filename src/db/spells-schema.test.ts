import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { spellStatus, spells } from './schema/spells';
import { users } from './schema/users';
import { workspaces } from './schema/workspaces';

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

// The behaviour half, following M4.1/M4.4/M4.4a/M7.1/M9.2's idiom: apply the
// shipped migration into this worker's disposable clone rather than
// hand-copying its DDL, so what is asserted below is the SQL production runs.
// `users`, `workspaces` and `ingredients` are stubbed to the one column the
// two new tables' foreign keys point at — applying their own migrations here
// would leave a __drizzle_migrations table behind for the next test file in
// this worker to trip over.
const MIGRATIONS_DIR = fileURLToPath(new URL('./migrations', import.meta.url));

function migrationStatementsContaining(marker: string): string[] {
  const file = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => fileURLToPath(new URL(`./migrations/${name}`, import.meta.url)))
    .find((path) => readFileSync(path, 'utf8').includes(marker));

  if (!file) throw new Error(`No migration in src/db/migrations contains ${marker}`);

  return readFileSync(file, 'utf8')
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

const AUTHOR = '11111111-1111-1111-1111-111111111111';
const COVEN = '22222222-2222-2222-2222-222222222222';
const OTHER_COVEN = '33333333-3333-3333-3333-333333333333';
const MUGWORT = '44444444-4444-4444-4444-444444444444';
const ABSENT = '99999999-9999-9999-9999-999999999999';

let sql: ReturnType<typeof postgres>;
let createdUnitEnum = false;

interface SpellRow {
  workspaceId?: string;
  title?: string | null;
  intent?: string | null;
  jarSize?: string | null;
  sealWaxColor?: string | null;
  moonPhase?: string | null;
  dayOfWeek?: string | null;
  instructions?: string | null;
}

// Every column §5 names except `status`, which is left to its default here so
// that the default is what the tests below observe; `cast` takes the status
// path when a test is about the enum itself.
async function record({
  workspaceId = COVEN,
  title = 'Hearth Guard',
  intent = null,
  jarSize = null,
  sealWaxColor = null,
  moonPhase = null,
  dayOfWeek = null,
  instructions = null,
}: SpellRow = {}): Promise<string> {
  const [inserted] = await sql`
    insert into spells
      (workspace_id, title, intent, jar_size, seal_wax_color, moon_phase, day_of_week,
       instructions, created_by, updated_by)
    values (${workspaceId}, ${title}, ${intent}, ${jarSize}, ${sealWaxColor}, ${moonPhase},
            ${dayOfWeek}, ${instructions}, ${AUTHOR}, ${AUTHOR})
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

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });

  await sql`drop table if exists spell_ingredients`;
  await sql`drop table if exists spells`;
  await sql`drop type if exists spell_status`;
  await sql`create table if not exists users (id uuid primary key)`;
  await sql`create table if not exists workspaces (id uuid primary key)`;
  await sql`create table if not exists ingredients (id uuid primary key)`;
  await sql`insert into users (id) values (${AUTHOR}) on conflict do nothing`;
  await sql`insert into workspaces (id) values (${COVEN}), (${OTHER_COVEN}) on conflict do nothing`;
  await sql`insert into ingredients (id) values (${MUGWORT}) on conflict do nothing`;

  // `spell_ingredients.unit` reuses M9.2's `inventory_unit` — one vocabulary,
  // one Postgres type — so this migration does not create it and the clone may
  // or may not already carry it, depending on what else ran in this worker.
  const [{ present }] = await sql`
    select exists (select 1 from pg_type where typname = 'inventory_unit') as present
  `;
  if (!present) {
    createdUnitEnum = true;
    for (const statement of migrationStatementsContaining(
      'CREATE TYPE "public"."inventory_unit"',
    ).filter((statement) => statement.includes('CREATE TYPE "public"."inventory_unit"'))) {
      await sql.unsafe(statement);
    }
  }

  for (const statement of migrationStatementsContaining('CREATE TABLE "spells"')) {
    await sql.unsafe(statement);
  }
});

beforeEach(async () => {
  await sql`delete from spell_ingredients`;
  await sql`delete from spells`;
});

afterAll(async () => {
  await sql`drop table if exists spell_ingredients`;
  await sql`drop table if exists spells`;
  await sql`drop type if exists spell_status`;
  if (createdUnitEnum) await sql`drop type if exists inventory_unit`;
  await sql`drop table if exists ingredients`;
  await sql`drop table if exists workspaces`;
  await sql`drop table if exists users`;
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
    const id = await record();

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
    const error = await failureOf(record({ title: null }));

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
    const id = await record();

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

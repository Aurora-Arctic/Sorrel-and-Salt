import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from './support/database';
import { AUDIT_COLUMNS, tableFacts } from './support/table-metadata';
import { MIGRATIONS_DIR } from '../support/paths';
import { type SpellOverrides, makeSpell, spellColumns } from '../support/fixtures';
import { spellStatus, spellVisibility, spells } from '@/db/schema/spells';
import { workspaces } from '@/db/schema/workspaces';
import { FIXTURE_USERS, WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';

// §5's columns, `visibility` included as of M10.3 — claude-docs/db.md,
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

const WORKSPACE_FK = 'spells_workspace_id_workspaces_id_fk';

describe('spells schema', () => {
  const { byName, indexes, checks, foreignKeyByColumn } = tableFacts(spells);

  // The full six: story 54's delete is recoverable. Only the three join tables take four (MB.34).
  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  it('requires a visibility and defaults it to workspace (M10.3)', () => {
    expect(byName.visibility.notNull).toBe(true);
    expect(byName.visibility.hasDefault).toBe(true);
  });

  it('carries a surrogate id as its primary key', () => {
    expect(byName.id.primary).toBe(true);
    expect(byName.id.hasDefault).toBe(true);
  });

  it('requires the workspace the spell belongs to, and its title', () => {
    expect(byName.workspace_id.notNull).toBe(true);
    expect(byName.title.notNull).toBe(true);
  });

  // §8's example creates a spell with a workspace and a title only; a draft is saved unfinished.
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

  // §5 names no index and no CHECK; a title is not unique, so two workings may share a name.
  it('declares no index and no check of its own', () => {
    expect(indexes).toEqual([]);
    expect(checks).toEqual([]);
  });

  it('stocks the status enum with §5’s two values, in order', () => {
    expect(spellStatus.enumValues).toEqual(['draft', 'complete']);
  });

  // An enum for the same reason `status` is one: v2's notes model has a third
  // tier, and `ALTER TYPE … ADD VALUE` expands where a widened CHECK re-validates.
  it('stocks the visibility enum with §5’s two values, in order', () => {
    expect(spellVisibility.enumValues).toEqual(['private', 'workspace']);
  });
});

const AUTHOR = FIXTURE_USERS.A.id;
const COVEN = WORKSPACE_W_ID;
const OTHER_COVEN = WORKSPACE_X_ID;
const ABSENT = '99999999-9999-9999-9999-999999999999';

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));

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

/** The sentinel `rewind` throws to roll its transaction back; never seen by a caller. */
class Rewound extends Error {}

/** Runs `body` in a transaction and rolls it back, whether or not it threw. */
async function rewind(body: (tx: postgres.TransactionSql) => Promise<void>): Promise<void> {
  await sql
    .begin(async (tx) => {
      await body(tx);
      throw new Rewound();
    })
    .catch((error: unknown) => {
      if (!(error instanceof Rewound)) throw error;
    });
}

beforeEach(async () => {
  await sql`truncate spells cascade`;
});

describe('spells table', () => {
  it('carries §5’s columns beside the six audit ones', async () => {
    expect(await catalogue.columnNames('spells')).toEqual(
      [...OWN_COLUMNS, ...AUDIT_COLUMNS].sort(),
    );
  });

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
    // 23502 is not_null_violation, named. Cast, because the fixture is typed
    // against a NOT NULL column and the refusal must be Postgres's, not TypeScript's.
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
  // workspace is otherwise constrained.
  it('lets one workspace hold two spells with the same title', async () => {
    await record();

    await expect(record()).resolves.toBeDefined();
  });

  it('lets two workspaces each hold a spell of the same name', async () => {
    await record();

    await expect(record({ workspaceId: OTHER_COVEN })).resolves.toBeDefined();
  });

  describe('status', () => {
    // In the column rather than the service, so a spell written by any path is
    // a draft until something says otherwise.
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

    // Exactly two in v1; v2's `proposed`/`approved` are an `ALTER TYPE ... ADD
    // VALUE`, which is why this is an enum.
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

  describe('visibility (M10.3)', () => {
    // In the column, so a spell written by any path — a seed, a fixture, a
    // service that never mentions visibility — joins the shared grimoire
    // rather than disappearing into its author's.
    it('defaults a new spell to workspace', async () => {
      const id = await record();

      const [row] = await sql`select visibility::text from spells where id = ${id}`;

      expect(row.visibility).toBe('workspace');
    });

    for (const visibility of ['private', 'workspace']) {
      it(`stores ${visibility}`, async () => {
        const id = await share(visibility);

        const [row] = await sql`select visibility::text from spells where id = ${id}`;

        expect(row.visibility).toBe(visibility);
      });
    }

    // Exactly two in v1; §13's notes carry a third tier, `public`, and adding
    // it there is an `ALTER TYPE ... ADD VALUE` rather than a CHECK rewrite.
    it('holds exactly the two labels and no more', async () => {
      const [row] = await sql`select enum_range(null::spell_visibility)::text[] as labels`;

      expect(row.labels).toEqual(['private', 'workspace']);
    });

    it('refuses a visibility outside the two', async () => {
      const error = await failureOf(share('public'));

      expect(error.code).toBe('22P02');
    });

    it('refuses a null visibility', async () => {
      const error = await failureOf(share(null));

      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('visibility');
    });

    // The criterion the whole wave-5 scheduling exists for: M1.23 seeded
    // spells against this table before the column arrived, and those rows have
    // to come out shared rather than null or private.
    //
    // Every migration in the template ran before this file's first insert, so
    // there is no pre-migration row left to read. The column is dropped and
    // re-added from `0018`'s own text instead — read off disk, so a migration
    // edited to drop the DEFAULT fails here rather than on production rows.
    it('fills a spell written before the column existed with workspace', async () => {
      const id = await record();

      const migration = readFileSync(join(MIGRATIONS_DIR, '0018_spell-visibility.sql'), 'utf8');
      const addColumn = migration
        .split('--> statement-breakpoint')
        .map((statement) => statement.trim())
        .find((statement) => /alter table "spells" add column "visibility"/i.test(statement));
      expect(addColumn, '0018 no longer adds spells.visibility').toBeDefined();

      // DDL is transactional in Postgres, and `rewind` rolls the whole thing
      // back: the column is gone for the length of this test and no further,
      // so an `ADD COLUMN` that fails here fails this assertion rather than
      // every test after it in the file.
      await rewind(async (tx) => {
        await tx`alter table spells drop column visibility`;
        await tx.unsafe(addColumn as string);

        const [row] = await tx`select visibility::text from spells where id = ${id}`;
        expect(row.visibility).toBe('workspace');
      });
    });
  });

  // Soft-deleted like every content table; there is no unique index to dodge,
  // so the tombstone costs nothing.
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

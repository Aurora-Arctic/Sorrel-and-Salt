import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { MIGRATIONS_DIR } from '../support/paths';
import { categories, categoryGroups } from '@/db/schema/categories';
import { users } from '@/db/schema/users';

const AUDIT_COLUMNS = [
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
  'deleted_at',
  'deleted_by',
];

const GROUPS_SLUG_UNIQUE = 'category_groups_slug_unique';
const CATEGORIES_SLUG_UNIQUE = 'categories_slug_unique';

// A column that would order groups or categories by hand, in any of the names
// such a column is usually given. DESIGN.md §5 lists none for either table:
// both render alphabetically by `name`, so an admin-added group lands where a
// reader would look for it rather than at the end of a list.
const ORDERING_COLUMNS = ['order', 'position', 'sort', 'sort_order', 'rank', 'display_order'];

function nonAuditForeignKeys(table: typeof categories | typeof categoryGroups) {
  const auditColumnNames = new Set(AUDIT_COLUMNS);
  return getTableConfig(table).foreignKeys.filter(
    (fk) => !auditColumnNames.has(fk.reference().columns[0].name),
  );
}

function auditForeignKeysReferenceUsers(table: typeof categories | typeof categoryGroups) {
  const byColumn = Object.fromEntries(
    getTableConfig(table).foreignKeys.map((fk) => {
      const { columns: local, foreignColumns, foreignTable } = fk.reference();
      return [local[0].name, { foreignColumnName: foreignColumns[0].name, foreignTable }];
    }),
  );

  for (const column of ['created_by', 'updated_by', 'deleted_by']) {
    expect(byColumn[column]).toBeDefined();
    expect(byColumn[column].foreignColumnName).toBe('id');
    expect(byColumn[column].foreignTable).toBe(users);
  }
}

describe('category_groups schema', () => {
  const { columns, indexes } = getTableConfig(categoryGroups);
  const byName = Object.fromEntries(columns.map((c) => [c.name, c]));

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'name', 'slug', 'color_dark', 'color_light', 'description', ...AUDIT_COLUMNS].sort(),
    );
  });

  // §5: "groups render alphabetically by `name`, so there is no order column
  // to maintain". Pinning the column set above already says it, but naming the
  // absence is what makes it survive a later "just add a sort field" —
  // ordering data by hand is the thing being refused, not one column spelling.
  it('carries no column for ordering groups by hand', () => {
    for (const column of ORDERING_COLUMNS) {
      expect(byName[column]).toBeUndefined();
    }
  });

  // §5: the two colours are the chip colour every category in the group
  // wears, one per theme — a group with only one of them is a group whose
  // chips are illegible on the other ground. Validating each against its own
  // theme's 4.5:1 floor is M5.6b's job, not a CHECK: the failure needs a
  // readable message naming the column and the ratio.
  it('requires both hexes, one per theme', () => {
    expect(byName.color_dark.notNull).toBe(true);
    expect(byName.color_light.notNull).toBe(true);
  });

  it('requires the name, slug and description every group carries', () => {
    for (const column of ['name', 'slug', 'description']) {
      expect(byName[column].notNull).toBe(true);
    }
  });

  it('makes the slug index unique and partial on deleted_at IS NULL (rule 4)', () => {
    const slugIndex = indexes.find((index) => index.config.name === GROUPS_SLUG_UNIQUE);

    expect(slugIndex).toBeDefined();
    expect(slugIndex?.config.unique).toBe(true);
    expect(slugIndex?.config.where).toBeDefined();
  });

  it('carries no workspace scoping', () => {
    expect(byName.workspace_id).toBeUndefined();
    expect(nonAuditForeignKeys(categoryGroups)).toEqual([]);
  });

  it('spreads the shared audit columns', () => {
    for (const column of AUDIT_COLUMNS) {
      expect(byName[column]).toBeDefined();
    }
    expect(byName.created_by.notNull).toBe(true);
    expect(byName.deleted_at.notNull).toBe(false);
  });

  it('references users.id from every audit id (MB.5)', () => {
    auditForeignKeysReferenceUsers(categoryGroups);
  });
});

describe('categories schema', () => {
  const { columns, indexes } = getTableConfig(categories);
  const byName = Object.fromEntries(columns.map((c) => [c.name, c]));

  // No `color`: MB.35 moved the chip colour onto the group, as the pair of
  // hexes one per theme that a single category column could not hold, and a
  // category wears its group's rather than one of its own.
  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'name', 'slug', 'description', 'group_id', ...AUDIT_COLUMNS].sort(),
    );
  });

  it('carries no column for ordering categories by hand', () => {
    for (const column of ORDERING_COLUMNS) {
      expect(byName[column]).toBeUndefined();
    }
  });

  it('requires the name, slug and description every category carries', () => {
    for (const column of ['name', 'slug', 'description']) {
      expect(byName[column].notNull).toBe(true);
    }
  });

  // §5: a vocabulary only an admin writes is a foreign key, where one a member
  // writes is text — the asymmetry with `ingredients.form`, which stays text
  // so a member can write `rhizome` uncurated. Nobody is blocked by a group
  // that does not exist yet, because the same admin writes both.
  it('points groupId at category_groups by foreign key, and requires it', () => {
    expect(byName.group_id.notNull).toBe(true);

    const [reference, ...rest] = nonAuditForeignKeys(categories).map((fk) => fk.reference());
    expect(rest).toEqual([]);
    expect(reference.columns[0].name).toBe('group_id');
    expect(reference.foreignTable).toBe(categoryGroups);
    expect(reference.foreignColumns[0].name).toBe('id');
  });

  it('makes the slug index unique and partial on deleted_at IS NULL (rule 4)', () => {
    const slugIndex = indexes.find((index) => index.config.name === CATEGORIES_SLUG_UNIQUE);

    expect(slugIndex).toBeDefined();
    expect(slugIndex?.config.unique).toBe(true);
    expect(slugIndex?.config.where).toBeDefined();
  });

  // The categories are one shared vocabulary, which is what makes §12's
  // assigned-versus-derived comparison meaningful: both sides draw from the
  // same set. A workspace-scoped category would be a second, private
  // vocabulary nobody else could read. Asserted as the absence of both halves
  // — the column the scoping would live in, and any foreign key that could
  // reach a workspace under another name.
  it('carries no workspace scoping', () => {
    expect(byName.workspace_id).toBeUndefined();
    expect(nonAuditForeignKeys(categories).map((fk) => fk.reference().foreignTable)).toEqual([
      categoryGroups,
    ]);
  });

  it('spreads the shared audit columns', () => {
    for (const column of AUDIT_COLUMNS) {
      expect(byName[column]).toBeDefined();
    }
    expect(byName.created_by.notNull).toBe(true);
    expect(byName.deleted_at.notNull).toBe(false);
  });

  it('references users.id from every audit id (MB.5)', () => {
    auditForeignKeysReferenceUsers(categories);
  });
});

// The behaviour half, applying the shipped migration into this worker's
// disposable clone rather than hand-copying its DDL, exactly as M4.1's test
// does — what is asserted below is then the SQL production runs. `users` is
// stubbed to the one column the audit foreign keys point at; it is M2.2's
// table, and applying its migrations here would leave a __drizzle_migrations
// row behind for the next test file in this worker to trip over.

function migrationStatementsContaining(marker: string): string[] {
  const file = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => join(MIGRATIONS_DIR, name))
    .find((path) => readFileSync(path, 'utf8').includes(marker));

  if (!file) throw new Error(`No migration in src/db/migrations contains ${marker}`);

  return readFileSync(file, 'utf8')
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

const AUTHOR = '11111111-1111-1111-1111-111111111111';
const ABSENT_GROUP = '99999999-9999-9999-9999-999999999999';

type Row = Record<string, string | null>;

function groupRow(overrides: Row = {}): Row {
  return {
    name: 'Protection & defense',
    slug: 'protection',
    color_dark: '#c8a2c8',
    color_light: '#6b4a6b',
    description: 'Keeping harm out.',
    created_by: AUTHOR,
    updated_by: AUTHOR,
    ...overrides,
  };
}

function categoryRow(groupId: string, overrides: Row = {}): Row {
  return {
    name: 'Warding',
    slug: 'warding',
    description: 'Holding a boundary.',
    group_id: groupId,
    created_by: AUTHOR,
    updated_by: AUTHOR,
    ...overrides,
  };
}

let sql: ReturnType<typeof postgres>;

async function insertGroup(overrides: Row = {}): Promise<string> {
  const [inserted] = await sql`
    insert into category_groups ${sql(groupRow(overrides))} returning id
  `;
  return inserted.id as string;
}

async function insertCategory(groupId: string, overrides: Row = {}): Promise<string> {
  const [inserted] = await sql`
    insert into categories ${sql(categoryRow(groupId, overrides))} returning id
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

async function softDelete(table: 'categories' | 'category_groups', id: string): Promise<void> {
  await sql`
    update ${sql(table)} set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${id}
  `;
}

async function columnNames(table: string): Promise<string[]> {
  const rows = await sql`
    select column_name from information_schema.columns
    where table_name = ${table} order by column_name
  `;
  return rows.map((r) => r.column_name as string);
}

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });

  await sql`drop table if exists categories`;
  await sql`drop table if exists category_groups`;
  await sql`create table if not exists users (id uuid primary key)`;
  await sql`insert into users (id) values (${AUTHOR}) on conflict do nothing`;

  for (const statement of migrationStatementsContaining('CREATE TABLE "category_groups"')) {
    await sql.unsafe(statement);
  }
});

beforeEach(async () => {
  await sql`delete from categories`;
  await sql`delete from category_groups`;
});

afterAll(async () => {
  await sql`drop table if exists categories`;
  await sql`drop table if exists category_groups`;
  await sql`drop table if exists users`;
  await sql.end();
});

describe('category_groups table', () => {
  it('is global: no workspace_id column to scope by, under any spelling', async () => {
    const columns = await columnNames('category_groups');

    expect(columns).not.toContain('workspace_id');
    expect(columns.filter((column) => column.includes('workspace'))).toEqual([]);
  });

  it('has no column to order groups by hand', async () => {
    const columns = await columnNames('category_groups');

    for (const column of ORDERING_COLUMNS) {
      expect(columns).not.toContain(column);
    }
  });

  describe('slug uniqueness', () => {
    it('rejects a second live group sharing a slug', async () => {
      await insertGroup();
      const error = await failureOf(insertGroup({ name: 'Protective work' }));

      // 23505 is unique_violation, named: proof the insert reached the index
      // rather than failing some other constraint first.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(GROUPS_SLUG_UNIQUE);
    });

    // CLAUDE.md rule 4: the index is partial, so soft-deleting a group
    // releases its slug rather than reserving it forever. The test above is
    // this one's precondition — without the soft delete the second insert is
    // refused, so the pass here is the predicate working and not an empty
    // table.
    it('frees the slug once the holder is soft-deleted', async () => {
      const first = await insertGroup();
      await softDelete('category_groups', first);

      const second = await insertGroup({ name: 'Protective work' });

      const rows = await sql`select id, deleted_at from category_groups order by created_at`;
      expect(rows.map((r) => r.id)).toEqual([first, second]);
      expect(rows[0].deleted_at).not.toBeNull();
      expect(rows[1].deleted_at).toBeNull();
    });

    // The display name is free — two groups may both want to be called
    // "Protection", and the slug is what tells them apart.
    it('does not constrain the display name', async () => {
      await insertGroup();
      await insertGroup({ slug: 'protective-work' });

      const [{ count }] = await sql`select count(*)::int as count from category_groups`;
      expect(count).toBe(2);
    });
  });

  it('requires both theme colours', async () => {
    for (const column of ['color_dark', 'color_light']) {
      const error = await failureOf(insertGroup({ [column]: null }));

      // 23502 is not_null_violation on that exact column: proof the insert
      // reached it and found neither a value nor a default.
      expect(error.code).toBe('23502');
      expect(error.column_name).toBe(column);
    }
  });

  it('requires the name, slug and description', async () => {
    for (const column of ['name', 'slug', 'description']) {
      const error = await failureOf(insertGroup({ [column]: null }));

      expect(error.code).toBe('23502');
      expect(error.column_name).toBe(column);
    }
  });
});

describe('categories table', () => {
  it('is global: no workspace_id column to scope by, under any spelling', async () => {
    const columns = await columnNames('categories');

    expect(columns).not.toContain('workspace_id');
    expect(columns.filter((column) => column.includes('workspace'))).toEqual([]);
  });

  it('has no colour of its own — the chip wears its group’s pair', async () => {
    const columns = await columnNames('categories');

    expect(columns.filter((column) => column.includes('color'))).toEqual([]);
  });

  it('has no column to order categories by hand', async () => {
    const columns = await columnNames('categories');

    for (const column of ORDERING_COLUMNS) {
      expect(columns).not.toContain(column);
    }
  });

  describe('group_id', () => {
    it('rejects an insert that omits it', async () => {
      const error = await failureOf(sql`
        insert into categories (name, slug, description, created_by, updated_by)
        values ('Warding', 'warding', 'Holding a boundary.', ${AUTHOR}, ${AUTHOR})
      `);

      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('group_id');
    });

    // The half a NOT NULL alone would miss: a required column still accepts
    // any uuid, and a typo'd group silently empties a chip section. The
    // accepting case below is what proves the refusal is the foreign key
    // rather than the insert never working at all.
    it('rejects a group id no group holds', async () => {
      const error = await failureOf(insertCategory(ABSENT_GROUP));

      // 23503 is foreign_key_violation.
      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe('categories_group_id_category_groups_id_fk');
    });

    it('accepts a group id an existing group holds', async () => {
      const group = await insertGroup();

      const category = await insertCategory(group);

      const [row] = await sql`select group_id from categories where id = ${category}`;
      expect(row.group_id).toBe(group);
    });
  });

  describe('slug uniqueness', () => {
    it('rejects a second live category sharing a slug', async () => {
      const group = await insertGroup();
      await insertCategory(group);
      const error = await failureOf(insertCategory(group, { name: 'Warded' }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(CATEGORIES_SLUG_UNIQUE);
    });

    it('frees the slug once the holder is soft-deleted', async () => {
      const group = await insertGroup();
      const first = await insertCategory(group);
      await softDelete('categories', first);

      const second = await insertCategory(group, { name: 'Warded' });

      const rows = await sql`select id, deleted_at from categories order by created_at`;
      expect(rows.map((r) => r.id)).toEqual([first, second]);
      expect(rows[0].deleted_at).not.toBeNull();
      expect(rows[1].deleted_at).toBeNull();
    });

    // Slug uniqueness is global rather than per group: the slug is what a
    // chip filter and the seed's idempotency key both read, and neither
    // carries a group alongside it.
    it('rejects a shared slug across two different groups', async () => {
      const protection = await insertGroup();
      const cleansing = await insertGroup({ name: 'Cleansing & release', slug: 'cleansing' });
      await insertCategory(protection);

      const error = await failureOf(insertCategory(cleansing));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(CATEGORIES_SLUG_UNIQUE);
    });
  });

  it('requires the name, slug and description', async () => {
    const group = await insertGroup();

    for (const column of ['name', 'slug', 'description']) {
      const error = await failureOf(insertCategory(group, { [column]: null }));

      expect(error.code).toBe('23502');
      expect(error.column_name).toBe(column);
    }
  });
});

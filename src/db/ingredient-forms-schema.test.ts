import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { ingredientFormGroups, ingredientForms } from './schema/ingredient-forms';
import { ingredients } from './schema/ingredients';
import { users } from './schema/users';

const AUDIT_COLUMNS = [
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
  'deleted_at',
  'deleted_by',
];

const GROUPS_SLUG_UNIQUE = 'ingredient_form_groups_slug_unique';
const FORMS_SLUG_UNIQUE = 'ingredient_forms_slug_unique';
const FORMS_GROUP_FK = 'ingredient_forms_group_id_ingredient_form_groups_id_fk';

// As in categories-schema.test.ts: a column that would order the vocabulary by
// hand, in any of the names such a column is usually given. DESIGN.md §5 lists
// none for either table — a form group sections an autofill dropdown
// alphabetically, and an admin-added group lands where a reader would look for
// it rather than at the end.
const ORDERING_COLUMNS = ['order', 'position', 'sort', 'sort_order', 'rank', 'display_order'];

type VocabularyTable = typeof ingredientForms | typeof ingredientFormGroups;

function nonAuditForeignKeys(table: VocabularyTable) {
  const auditColumnNames = new Set(AUDIT_COLUMNS);
  return getTableConfig(table).foreignKeys.filter(
    (fk) => !auditColumnNames.has(fk.reference().columns[0].name),
  );
}

function auditForeignKeysReferenceUsers(table: VocabularyTable) {
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

describe('ingredient_form_groups schema', () => {
  const { columns, indexes } = getTableConfig(ingredientFormGroups);
  const byName = Object.fromEntries(columns.map((c) => [c.name, c]));

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'name', 'slug', 'description', ...AUDIT_COLUMNS].sort(),
    );
  });

  // The one column this table has that `category_groups` does not have to
  // justify — and the reason it is absent: a form group sections an autofill
  // dropdown, where a category group tints a chip (§5, MB.35).
  it('carries no colour: form groups section a dropdown, they are not chips', () => {
    expect(Object.keys(byName).filter((column) => column.includes('color'))).toEqual([]);
  });

  it('carries no column for ordering groups by hand', () => {
    for (const column of ORDERING_COLUMNS) {
      expect(byName[column]).toBeUndefined();
    }
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
    expect(nonAuditForeignKeys(ingredientFormGroups)).toEqual([]);
  });

  it('spreads the shared audit columns', () => {
    for (const column of AUDIT_COLUMNS) {
      expect(byName[column]).toBeDefined();
    }
    expect(byName.created_by.notNull).toBe(true);
    expect(byName.deleted_at.notNull).toBe(false);
  });

  it('references users.id from every audit id (MB.5)', () => {
    auditForeignKeysReferenceUsers(ingredientFormGroups);
  });
});

describe('ingredient_forms schema', () => {
  const { columns, indexes } = getTableConfig(ingredientForms);
  const byName = Object.fromEntries(columns.map((c) => [c.name, c]));

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'name', 'slug', 'description', 'group_id', ...AUDIT_COLUMNS].sort(),
    );
  });

  it('carries no column for ordering forms by hand', () => {
    for (const column of ORDERING_COLUMNS) {
      expect(byName[column]).toBeUndefined();
    }
  });

  it('requires the name, slug and description every form carries', () => {
    for (const column of ['name', 'slug', 'description']) {
      expect(byName[column].notNull).toBe(true);
    }
  });

  // §5: a vocabulary only an admin writes is a foreign key, where one a member
  // writes is text. Both directions of that rule sit in this one file —
  // `ingredient_forms.groupId` below is the foreign key, `ingredients.form`
  // further down is the text.
  it('points groupId at ingredient_form_groups by foreign key, and requires it', () => {
    expect(byName.group_id.notNull).toBe(true);

    const [reference, ...rest] = nonAuditForeignKeys(ingredientForms).map((fk) => fk.reference());
    expect(rest).toEqual([]);
    expect(reference.columns[0].name).toBe('group_id');
    expect(reference.foreignTable).toBe(ingredientFormGroups);
    expect(reference.foreignColumns[0].name).toBe('id');
  });

  it('makes the slug index unique and partial on deleted_at IS NULL (rule 4)', () => {
    const slugIndex = indexes.find((index) => index.config.name === FORMS_SLUG_UNIQUE);

    expect(slugIndex).toBeDefined();
    expect(slugIndex?.config.unique).toBe(true);
    expect(slugIndex?.config.where).toBeDefined();
  });

  it('carries no workspace scoping', () => {
    expect(byName.workspace_id).toBeUndefined();
    expect(nonAuditForeignKeys(ingredientForms).map((fk) => fk.reference().foreignTable)).toEqual([
      ingredientFormGroups,
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
    auditForeignKeysReferenceUsers(ingredientForms);
  });
});

const MIGRATIONS_DIR = fileURLToPath(new URL('./migrations', import.meta.url));

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) =>
      readFileSync(fileURLToPath(new URL(`./migrations/${name}`, import.meta.url)), 'utf8'),
    );
}

function migrationStatementsContaining(marker: string): string[] {
  const file = migrationFiles().find((contents) => contents.includes(marker));

  if (!file) throw new Error(`No migration in src/db/migrations contains ${marker}`);

  return file
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

// DESIGN.md §5: "`ingredients.form` is `text`, not a foreign key to this
// table`, and that is the property the whole design rests on." An FK would key
// identity on a surrogate id and make `rhizome` unwritable until an admin
// curated it, where text lets `canonicalKey` normalise the string. Asserted
// from both ends — the schema Drizzle generates migrations from, and the SQL
// actually shipped, since a hand-edited migration would not show up in the
// first.
describe('ingredients.form is text over this vocabulary, not a foreign key to it', () => {
  it('declares form as a nullable text column', () => {
    const form = getTableConfig(ingredients).columns.find((column) => column.name === 'form');

    expect(form).toBeDefined();
    expect(form?.getSQLType()).toBe('text');
    expect(form?.notNull).toBe(false);
  });

  it('points no ingredients foreign key at ingredient_forms', () => {
    const referenced = getTableConfig(ingredients).foreignKeys.map(
      (fk) => fk.reference().foreignTable,
    );

    expect(referenced).not.toContain(ingredientForms);
    expect(referenced).not.toContain(ingredientFormGroups);
  });

  it('ships no migration adding such a foreign key', () => {
    const offending = migrationFiles().filter((contents) =>
      /alter table\s+"?ingredients"?[\s\S]*?references\s+"?ingredient_forms"?/i.test(contents),
    );

    expect(offending).toEqual([]);
  });
});

// The behaviour half, applying the shipped migration into this worker's
// disposable clone rather than hand-copying its DDL — what is asserted below is
// then the SQL production runs. `users` is stubbed to the one column the audit
// foreign keys point at, exactly as the categories and ingredients tests do.
const AUTHOR = '11111111-1111-1111-1111-111111111111';
const ABSENT_GROUP = '99999999-9999-9999-9999-999999999999';

type Row = Record<string, string | null>;

function groupRow(overrides: Row = {}): Row {
  return {
    name: 'Organism part',
    slug: 'organism-part',
    description: 'A part of the plant, fungus, animal or mineral itself.',
    created_by: AUTHOR,
    updated_by: AUTHOR,
    ...overrides,
  };
}

function formRow(groupId: string, overrides: Row = {}): Row {
  return {
    name: 'Root',
    slug: 'root',
    description: 'The underground structure, lifted and dried.',
    group_id: groupId,
    created_by: AUTHOR,
    updated_by: AUTHOR,
    ...overrides,
  };
}

let sql: ReturnType<typeof postgres>;

async function insertGroup(overrides: Row = {}): Promise<string> {
  const [inserted] = await sql`
    insert into ingredient_form_groups ${sql(groupRow(overrides))} returning id
  `;
  return inserted.id as string;
}

async function insertForm(groupId: string, overrides: Row = {}): Promise<string> {
  const [inserted] = await sql`
    insert into ingredient_forms ${sql(formRow(groupId, overrides))} returning id
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

async function softDelete(
  table: 'ingredient_forms' | 'ingredient_form_groups',
  id: string,
): Promise<void> {
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

  await sql`drop table if exists ingredient_forms`;
  await sql`drop table if exists ingredient_form_groups`;
  await sql`create table if not exists users (id uuid primary key)`;
  await sql`insert into users (id) values (${AUTHOR}) on conflict do nothing`;

  for (const statement of migrationStatementsContaining('CREATE TABLE "ingredient_form_groups"')) {
    await sql.unsafe(statement);
  }
});

beforeEach(async () => {
  await sql`delete from ingredient_forms`;
  await sql`delete from ingredient_form_groups`;
});

afterAll(async () => {
  await sql`drop table if exists ingredient_forms`;
  await sql`drop table if exists ingredient_form_groups`;
  await sql`drop table if exists users`;
  await sql.end();
});

describe('ingredient_form_groups table', () => {
  it('is global: no workspace_id column to scope by, under any spelling', async () => {
    const columns = await columnNames('ingredient_form_groups');

    expect(columns).not.toContain('workspace_id');
    expect(columns.filter((column) => column.includes('workspace'))).toEqual([]);
  });

  it('has no colour column — a form group is not a chip', async () => {
    const columns = await columnNames('ingredient_form_groups');

    expect(columns.filter((column) => column.includes('color'))).toEqual([]);
  });

  it('has no column to order groups by hand', async () => {
    const columns = await columnNames('ingredient_form_groups');

    for (const column of ORDERING_COLUMNS) {
      expect(columns).not.toContain(column);
    }
  });

  describe('slug uniqueness', () => {
    it('rejects a second live group sharing a slug', async () => {
      await insertGroup();
      const error = await failureOf(insertGroup({ name: 'Part of the organism' }));

      // 23505 is unique_violation, named: proof the insert reached the index
      // rather than failing some other constraint first.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(GROUPS_SLUG_UNIQUE);
    });

    // Rule 4: the index is partial, so soft-deleting a group releases its slug
    // rather than reserving it forever. The test above is this one's
    // precondition — without the soft delete the second insert is refused, so
    // the pass here is the predicate working and not an empty table.
    it('frees the slug once the holder is soft-deleted', async () => {
      const first = await insertGroup();
      await softDelete('ingredient_form_groups', first);

      const second = await insertGroup({ name: 'Part of the organism' });

      const rows = await sql`select id, deleted_at from ingredient_form_groups order by created_at`;
      expect(rows.map((r) => r.id)).toEqual([first, second]);
      expect(rows[0].deleted_at).not.toBeNull();
      expect(rows[1].deleted_at).toBeNull();
    });
  });

  it('requires the name, slug and description', async () => {
    for (const column of ['name', 'slug', 'description']) {
      const error = await failureOf(insertGroup({ [column]: null }));

      // 23502 is not_null_violation on that exact column: proof the insert
      // reached it and found neither a value nor a default.
      expect(error.code).toBe('23502');
      expect(error.column_name).toBe(column);
    }
  });

  // §5 asks for a description that is required *and non-empty*: NOT NULL alone
  // accepts '' and '   ', which is a group that explains nothing while
  // satisfying the column.
  it('rejects a blank description', async () => {
    for (const blank of ['', '   ']) {
      const error = await failureOf(insertGroup({ description: blank }));

      // 23514 is check_violation.
      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe('ingredient_form_groups_description_not_blank');
    }
  });
});

describe('ingredient_forms table', () => {
  it('is global: no workspace_id column to scope by, under any spelling', async () => {
    const columns = await columnNames('ingredient_forms');

    expect(columns).not.toContain('workspace_id');
    expect(columns.filter((column) => column.includes('workspace'))).toEqual([]);
  });

  it('has no column to order forms by hand', async () => {
    const columns = await columnNames('ingredient_forms');

    for (const column of ORDERING_COLUMNS) {
      expect(columns).not.toContain(column);
    }
  });

  describe('group_id', () => {
    it('rejects an insert that omits it', async () => {
      const error = await failureOf(sql`
        insert into ingredient_forms (name, slug, description, created_by, updated_by)
        values ('Root', 'root', 'The underground structure.', ${AUTHOR}, ${AUTHOR})
      `);

      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('group_id');
    });

    // The half a NOT NULL alone would miss: a required column still accepts any
    // uuid, and a typo'd group silently empties a section of the autofill. The
    // accepting case below is what proves the refusal is the foreign key rather
    // than the insert never working at all.
    it('rejects a group id no group holds', async () => {
      const error = await failureOf(insertForm(ABSENT_GROUP));

      // 23503 is foreign_key_violation.
      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(FORMS_GROUP_FK);
    });

    it('accepts a group id an existing group holds', async () => {
      const group = await insertGroup();

      const form = await insertForm(group);

      const [row] = await sql`select group_id from ingredient_forms where id = ${form}`;
      expect(row.group_id).toBe(group);
    });
  });

  describe('slug uniqueness', () => {
    it('rejects a second live form sharing a slug', async () => {
      const group = await insertGroup();
      await insertForm(group);
      const error = await failureOf(insertForm(group, { name: 'Rootstock' }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(FORMS_SLUG_UNIQUE);
    });

    it('frees the slug once the holder is soft-deleted', async () => {
      const group = await insertGroup();
      const first = await insertForm(group);
      await softDelete('ingredient_forms', first);

      const second = await insertForm(group, { name: 'Rootstock' });

      const rows = await sql`select id, deleted_at from ingredient_forms order by created_at`;
      expect(rows.map((r) => r.id)).toEqual([first, second]);
      expect(rows[0].deleted_at).not.toBeNull();
      expect(rows[1].deleted_at).toBeNull();
    });

    // Slug uniqueness is global rather than per group, as on `categories`: the
    // slug is what M4.3a's idempotency key reads, and it carries no group
    // alongside it.
    it('rejects a shared slug across two different groups', async () => {
      const organismPart = await insertGroup();
      const preparation = await insertGroup({ name: 'Preparation', slug: 'preparation' });
      await insertForm(organismPart);

      const error = await failureOf(insertForm(preparation, { slug: 'root' }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(FORMS_SLUG_UNIQUE);
    });
  });

  // The deliberate gap, asserted so it stays deliberate. Uniqueness is on the
  // slug alone on all four vocabulary tables (MB.35), so two live forms may
  // both be called "Root" — one an organism part, one a preparation. Nothing in
  // the database distinguishes them, and `ingredients.form` stores the string
  // rather than an id, so the autofill is where the ambiguity has to be
  // resolved: M4.7a returns each suggestion's group and M5.10a renders it, so a
  // reader picking from the dropdown sees "Root (organism part)" beside "Root
  // (preparation)". If a `name` index is ever added here, that pair of
  // requirements is what it supersedes — say so rather than deleting this test.
  it('permits two live forms to share a display name, told apart by their group', async () => {
    const organismPart = await insertGroup();
    const preparation = await insertGroup({ name: 'Preparation', slug: 'preparation' });

    await insertForm(organismPart);
    await insertForm(preparation, { slug: 'root-preparation' });

    const rows = await sql`
      select f.name, g.name as group_name
      from ingredient_forms f join ingredient_form_groups g on g.id = f.group_id
      order by g.name
    `;
    expect(rows.map((r) => r.name)).toEqual(['Root', 'Root']);
    expect(rows.map((r) => r.group_name)).toEqual(['Organism part', 'Preparation']);
  });

  it('requires the name, slug and description', async () => {
    const group = await insertGroup();

    for (const column of ['name', 'slug', 'description']) {
      const error = await failureOf(insertForm(group, { [column]: null }));

      expect(error.code).toBe('23502');
      expect(error.column_name).toBe(column);
    }
  });

  // §5 again, and the sharper case of the two: a curated value exists to
  // explain itself — `rootBark` says "the bark of the root, not the stem" — so
  // a blank description is a curated row that curates nothing.
  it('rejects a blank description', async () => {
    const group = await insertGroup();

    for (const blank of ['', '   ']) {
      const error = await failureOf(insertForm(group, { description: blank }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe('ingredient_forms_description_not_blank');
    }
  });
});

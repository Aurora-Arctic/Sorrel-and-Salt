import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from './support/database';
import { AUDIT_COLUMNS, tableFacts } from './support/table-metadata';
import { MIGRATIONS_DIR } from '../support/paths';
import { ingredientFormGroups, ingredientForms } from '@/db/schema/ingredient-forms';
import { ingredients } from '@/db/schema/ingredients';
import { FIXTURE_USERS } from '@/db/seed/standard';

const GROUPS_SLUG_UNIQUE = 'ingredient_form_groups_slug_unique';
const FORMS_SLUG_UNIQUE = 'ingredient_forms_slug_unique';
const FORMS_GROUP_FK = 'ingredient_forms_group_id_ingredient_form_groups_id_fk';

// As in categories-schema.test.ts: a hand-ordering column under any usual name; §5 lists none.
const ORDERING_COLUMNS = ['order', 'position', 'sort', 'sort_order', 'rank', 'display_order'];

describe('ingredient_form_groups schema', () => {
  const { byName, indexes, nonAuditForeignKeys } = tableFacts(ingredientFormGroups);

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'name', 'slug', 'description', ...AUDIT_COLUMNS].sort(),
    );
  });

  // No colour: a form group sections a dropdown, where a category group tints a chip (MB.35).
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
    expect(nonAuditForeignKeys).toEqual([]);
  });
});

describe('ingredient_forms schema', () => {
  const { byName, indexes, nonAuditForeignKeys } = tableFacts(ingredientForms);

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

  // A vocabulary only an admin writes is a foreign key; `ingredients.form`,
  // which a member writes, is text (asserted further down).
  it('points groupId at ingredient_form_groups by foreign key, and requires it', () => {
    expect(byName.group_id.notNull).toBe(true);

    const [reference, ...rest] = nonAuditForeignKeys;
    expect(rest).toEqual([]);
    expect(reference.column).toBe('group_id');
    expect(reference.foreignTable).toBe(ingredientFormGroups);
    expect(reference.foreignColumnName).toBe('id');
  });

  it('makes the slug index unique and partial on deleted_at IS NULL (rule 4)', () => {
    const slugIndex = indexes.find((index) => index.config.name === FORMS_SLUG_UNIQUE);

    expect(slugIndex).toBeDefined();
    expect(slugIndex?.config.unique).toBe(true);
    expect(slugIndex?.config.where).toBeDefined();
  });

  it('carries no workspace scoping', () => {
    expect(byName.workspace_id).toBeUndefined();
    expect(nonAuditForeignKeys.map((fk) => fk.foreignTable)).toEqual([ingredientFormGroups]);
  });
});

// Read from disk for the one assertion a hand-edited migration would hide from the schema.
function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => readFileSync(join(MIGRATIONS_DIR, name), 'utf8'));
}

// §5: `ingredients.form` is text, not a foreign key to this table — an FK would
// key identity on a surrogate id and make an uncurated value unwritable.
// Asserted from both the Drizzle schema and the shipped SQL —
// claude-docs/db.md, "The ingredient identity model".
describe('ingredients.form is text over this vocabulary, not a foreign key to it', () => {
  it('declares form as a nullable text column', () => {
    const form = tableFacts(ingredients).columns.find((column) => column.name === 'form');

    expect(form).toBeDefined();
    expect(form?.getSQLType()).toBe('text');
    expect(form?.notNull).toBe(false);
  });

  it('points no ingredients foreign key at ingredient_forms', () => {
    const referenced = tableFacts(ingredients).foreignKeys.map((fk) => fk.reference().foreignTable);

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

const AUTHOR = FIXTURE_USERS.A.id;
const ABSENT_GROUP = '99999999-9999-9999-9999-999999999999';

type Row = Record<string, string | null>;

function groupRow(overrides: Row = {}): Row {
  return {
    name: 'Botanical',
    slug: 'botanical',
    description: 'Parts of a plant or fungus.',
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
const catalogue = useTestDatabase((client) => (sql = client));

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

async function softDelete(
  table: 'ingredient_forms' | 'ingredient_form_groups',
  id: string,
): Promise<void> {
  await sql`
    update ${sql(table)} set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${id}
  `;
}

beforeEach(async () => {
  await sql`truncate ingredient_forms, ingredient_form_groups cascade`;
});

describe('ingredient_form_groups table', () => {
  it('is global: no workspace_id column to scope by, under any spelling', async () => {
    const columns = await catalogue.columnNames('ingredient_form_groups');

    expect(columns).not.toContain('workspace_id');
    expect(columns.filter((column) => column.includes('workspace'))).toEqual([]);
  });

  it('has no colour column — a form group is not a chip', async () => {
    const columns = await catalogue.columnNames('ingredient_form_groups');

    expect(columns.filter((column) => column.includes('color'))).toEqual([]);
  });

  it('has no column to order groups by hand', async () => {
    const columns = await catalogue.columnNames('ingredient_form_groups');

    for (const column of ORDERING_COLUMNS) {
      expect(columns).not.toContain(column);
    }
  });

  describe('slug uniqueness', () => {
    it('rejects a second live group sharing a slug', async () => {
      await insertGroup();
      const error = await failureOf(insertGroup({ name: 'Part of the organism' }));

      // 23505 is unique_violation, named: the index refused, not something earlier.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(GROUPS_SLUG_UNIQUE);
    });

    // The test above is the precondition: without the soft delete the second
    // insert is refused, so this pass is the predicate and not an empty table.
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

      // 23502 is not_null_violation on that exact column.
      expect(error.code).toBe('23502');
      expect(error.column_name).toBe(column);
    }
  });

  // NOT NULL alone accepts '' and '   ' — a group that explains nothing.
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
    const columns = await catalogue.columnNames('ingredient_forms');

    expect(columns).not.toContain('workspace_id');
    expect(columns.filter((column) => column.includes('workspace'))).toEqual([]);
  });

  it('has no column to order forms by hand', async () => {
    const columns = await catalogue.columnNames('ingredient_forms');

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

    // The accepting case below is what proves the refusal is the foreign key's.
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

    // Global rather than per group, as on `categories`: the seed's idempotency
    // key reads the slug alone.
    it('rejects a shared slug across two different groups', async () => {
      const organismPart = await insertGroup();
      const substance = await insertGroup({ name: 'Substance', slug: 'substance' });
      await insertForm(organismPart);

      const error = await failureOf(insertForm(substance, { slug: 'root' }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(FORMS_SLUG_UNIQUE);
    });
  });

  // The deliberate gap: uniqueness is on the slug alone, so two live forms may
  // share a display name ("Wax", animal and substance) and the autofill shows
  // the group beside each. A `name` index would supersede that — say so rather
  // than deleting this test.
  it('permits two live forms to share a display name, told apart by their group', async () => {
    const organismPart = await insertGroup();
    const substance = await insertGroup({ name: 'Substance', slug: 'substance' });

    await insertForm(organismPart);
    await insertForm(substance, { slug: 'root-preparation' });

    const rows = await sql`
      select f.name, g.name as group_name
      from ingredient_forms f join ingredient_form_groups g on g.id = f.group_id
      order by g.name
    `;
    expect(rows.map((r) => r.name)).toEqual(['Root', 'Root']);
    expect(rows.map((r) => r.group_name)).toEqual(['Botanical', 'Substance']);
  });

  it('requires the name, slug and description', async () => {
    const group = await insertGroup();

    for (const column of ['name', 'slug', 'description']) {
      const error = await failureOf(insertForm(group, { [column]: null }));

      expect(error.code).toBe('23502');
      expect(error.column_name).toBe(column);
    }
  });

  // A curated value exists to explain itself; a blank description curates nothing.
  it('rejects a blank description', async () => {
    const group = await insertGroup();

    for (const blank of ['', '   ']) {
      const error = await failureOf(insertForm(group, { description: blank }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe('ingredient_forms_description_not_blank');
    }
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { foreignKeyStatements, shippedMigrationStatements } from '../../../support/db/migrations';
import { deities, deityTraditions } from '@/modules/vocabulary/schema/deities';
import { ingredients } from '@/modules/ingredients/schema/ingredients';
import { FIXTURE_USERS } from '@/db/seed/standard';
import type { Row } from './types';

const TRADITIONS_SLUG_UNIQUE = 'deity_traditions_slug_unique';
const DEITIES_SLUG_UNIQUE = 'deities_slug_unique';
const DEITIES_TRADITION_FK = 'deities_tradition_id_deity_traditions_id_fk';
const DEITIES_TRGM = 'deities_trgm';

// As in ingredient-forms-schema.test.ts: a hand-ordering column under any usual name; §5 lists none.
const ORDERING_COLUMNS = ['order', 'position', 'sort', 'sort_order', 'rank', 'display_order'];

describe('deity_traditions schema', () => {
  const { byName, byIndexName, nonAuditForeignKeys } = tableFacts(deityTraditions);

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'name', 'slug', 'description', ...AUDIT_COLUMNS].sort(),
    );
  });

  // A tradition labels a suggestion rather than a chip, and traditions list
  // alphabetically (claude-docs/db/deity-vocabulary.md, "The deity vocabulary").
  it('carries no colour, ordering column or workspace scoping', () => {
    expect(Object.keys(byName).filter((column) => column.includes('color'))).toEqual([]);
    for (const column of ORDERING_COLUMNS) {
      expect(byName[column]).toBeUndefined();
    }
    expect(byName.workspace_id).toBeUndefined();
    expect(nonAuditForeignKeys).toEqual([]);
  });

  it('requires the name, slug and description every tradition carries', () => {
    for (const column of ['name', 'slug', 'description']) {
      expect(byName[column].notNull).toBe(true);
    }
  });

  // No trigram index: the autofill returns a tradition's name and never searches it.
  it('declares one index, the slug, unique and partial on deleted_at IS NULL (rule 4)', () => {
    const slugIndex = byIndexName[TRADITIONS_SLUG_UNIQUE];

    expect(slugIndex).toBeDefined();
    expect(slugIndex.config.unique).toBe(true);
    expect(slugIndex.config.where).toBeDefined();
    expect(Object.keys(byIndexName)).toEqual([TRADITIONS_SLUG_UNIQUE]);
  });
});

describe('deities schema', () => {
  const { byName, byIndexName, nonAuditForeignKeys } = tableFacts(deities);

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'name', 'slug', 'description', 'tradition_id', ...AUDIT_COLUMNS].sort(),
    );
  });

  it('carries no colour, ordering column or workspace scoping', () => {
    expect(Object.keys(byName).filter((column) => column.includes('color'))).toEqual([]);
    for (const column of ORDERING_COLUMNS) {
      expect(byName[column]).toBeUndefined();
    }
    expect(byName.workspace_id).toBeUndefined();
  });

  it('requires the name, slug and description every deity carries', () => {
    for (const column of ['name', 'slug', 'description']) {
      expect(byName[column].notNull).toBe(true);
    }
  });

  // A vocabulary only an admin writes is a foreign key; `ingredients.deities`,
  // which a member writes, is text (asserted further down).
  it('points traditionId at deity_traditions by foreign key, its one key beside the audit ids', () => {
    expect(byName.tradition_id.notNull).toBe(true);

    const [reference, ...rest] = nonAuditForeignKeys;
    expect(rest).toEqual([]);
    expect(reference.column).toBe('tradition_id');
    expect(reference.foreignTable).toBe(deityTraditions);
    expect(reference.foreignColumnName).toBe('id');
  });

  it('makes the slug index unique and partial on deleted_at IS NULL (rule 4)', () => {
    const slugIndex = byIndexName[DEITIES_SLUG_UNIQUE];

    expect(slugIndex).toBeDefined();
    expect(slugIndex.config.unique).toBe(true);
    expect(slugIndex.config.where).toBeDefined();
  });

  // The autofill matches a description as well as a name — typing `crossroads`
  // offers Hecate — by `%` and `<%`, and only a trigram index answers either.
  it('declares one gin trigram index over name and description, neither unique nor partial', () => {
    const trigram = byIndexName[DEITIES_TRGM];

    expect(trigram?.config.method).toBe('gin');
    expect(trigram?.config.columns).toHaveLength(2);
    expect(trigram?.config.unique).toBe(false);
    expect(trigram?.config.where).toBeUndefined();
    expect(Object.keys(byIndexName).sort()).toEqual([DEITIES_SLUG_UNIQUE, DEITIES_TRGM]);
  });
});

// §5: `ingredients.deities` is free text over this vocabulary — an FK would
// make an uncurated value unwritable (claude-docs/db/deity-vocabulary.md).
describe('ingredients.deities is a text list over this vocabulary, not a foreign key to it', () => {
  it('declares deities as a nullable text[] column', () => {
    const declared = tableFacts(ingredients).columns.find((column) => column.name === 'deities');

    expect(declared).toBeDefined();
    expect(declared?.getSQLType()).toBe('text[]');
    expect(declared?.notNull).toBe(false);
  });

  it('points no ingredients foreign key at either table', () => {
    const referenced = tableFacts(ingredients).foreignKeys.map((fk) => fk.reference().foreignTable);

    expect(referenced).not.toContain(deities);
    expect(referenced).not.toContain(deityTraditions);
  });

  // Read from disk: a hand-edited migration could add a key the schema lacks.
  it('ships no migration adding such a foreign key', () => {
    const statements = shippedMigrationStatements();

    expect(foreignKeyStatements(statements, 'ingredients', 'deities')).toEqual([]);
    expect(foreignKeyStatements(statements, 'ingredients', 'deity_traditions')).toEqual([]);
  });
});

const AUTHOR = FIXTURE_USERS.A.id;
const ABSENT_TRADITION = '99999999-9999-9999-9999-999999999999';

// Invented values, so no row here collides with what MB.129 seeds.
function traditionRow(overrides: Row = {}): Row {
  return {
    name: 'Testorian',
    slug: 'testorian',
    description: 'A tradition kept only by fixtures.',
    created_by: AUTHOR,
    updated_by: AUTHOR,
    ...overrides,
  };
}

function deityRow(traditionId: string, overrides: Row = {}): Row {
  return {
    name: 'Fixturia',
    slug: 'fixturia',
    description: 'Goddess of the test run, honoured before every assertion.',
    tradition_id: traditionId,
    created_by: AUTHOR,
    updated_by: AUTHOR,
    ...overrides,
  };
}

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));

async function insertTradition(overrides: Row = {}): Promise<string> {
  const [inserted] = await sql`
    insert into deity_traditions ${sql(traditionRow(overrides))} returning id
  `;
  return inserted.id as string;
}

async function insertDeity(traditionId: string, overrides: Row = {}): Promise<string> {
  const [inserted] = await sql`
    insert into deities ${sql(deityRow(traditionId, overrides))} returning id
  `;
  return inserted.id as string;
}

async function softDelete(table: 'deities' | 'deity_traditions', id: string): Promise<void> {
  await sql`
    update ${sql(table)} set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${id}
  `;
}

beforeEach(async () => {
  await sql`truncate deities, deity_traditions cascade`;
});

describe.each([
  { table: 'deity_traditions', columns: ['id', 'name', 'slug', 'description'] },
  { table: 'deities', columns: ['id', 'name', 'slug', 'description', 'tradition_id'] },
])('$table in the catalogue', ({ table, columns }) => {
  it('carries exactly the §5 columns and the audit spread', async () => {
    expect((await catalogue.columnNames(table)).sort()).toEqual(
      [...columns, ...AUDIT_COLUMNS].sort(),
    );
  });

  it('carries no unique index beyond the primary key and the slug', async () => {
    expect(await catalogue.uniqueIndexNames(table)).toEqual([
      `${table}_pkey`,
      `${table}_slug_unique`,
    ]);
  });
});

// The catalogue's word, so a hand-edited migration cannot add a key the schema lacks.
async function foreignKeysOf(table: string): Promise<{ column: string; target: string }[]> {
  const keys = await sql`
    select a.attname as column, c.confrelid::regclass::text as target
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.contype = 'f' and c.conrelid = ${table}::regclass
    order by a.attname
  `;
  return keys.map((key) => ({ column: key.column as string, target: key.target as string }));
}

describe('deity_traditions table', () => {
  it('references nothing but users, through the audit stamps', async () => {
    expect(await foreignKeysOf('deity_traditions')).toEqual([
      { column: 'created_by', target: 'users' },
      { column: 'deleted_by', target: 'users' },
      { column: 'updated_by', target: 'users' },
    ]);
  });

  it('takes no trigram index: the autofill never searches a tradition', async () => {
    const indexes = await sql`
      select indexname from pg_indexes where tablename = 'deity_traditions' order by indexname
    `;

    expect(indexes.map((index) => index.indexname)).toEqual([
      'deity_traditions_pkey',
      TRADITIONS_SLUG_UNIQUE,
    ]);
  });

  describe('slug uniqueness', () => {
    it('rejects a second live tradition sharing a slug', async () => {
      await insertTradition();
      const error = await failureOf(insertTradition({ name: 'Testorian Rite' }));

      // 23505 is unique_violation, named: the index refused, not something earlier.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(TRADITIONS_SLUG_UNIQUE);
    });

    // The test above is the precondition: without the soft delete the second
    // insert is refused, so this pass is the predicate and not an empty table.
    it('frees the slug once the holder is soft-deleted', async () => {
      const first = await insertTradition();
      await softDelete('deity_traditions', first);

      const second = await insertTradition({ name: 'Testorian Rite' });

      const rows = await sql`select id, deleted_at from deity_traditions`;
      expect(rows.map((r) => r.id).sort()).toEqual([first, second].sort());
      expect(rows.find((r) => r.id === first)?.deleted_at).not.toBeNull();
      expect(rows.find((r) => r.id === second)?.deleted_at).toBeNull();
    });
  });

  it('requires the name, slug and description', async () => {
    for (const column of ['name', 'slug', 'description']) {
      const error = await failureOf(insertTradition({ [column]: null }));

      // 23502 is not_null_violation on that exact column.
      expect(error.code).toBe('23502');
      expect(error.column_name).toBe(column);
    }
  });

  // NOT NULL alone accepts '' and '   ' — a tradition that explains nothing.
  it('rejects a blank description', async () => {
    for (const blank of ['', '   ']) {
      const error = await failureOf(insertTradition({ description: blank }));

      // 23514 is check_violation.
      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe('deity_traditions_description_not_blank');
    }
  });
});

describe('deities table', () => {
  it('references deity_traditions from tradition_id and users from the audit stamps, and nothing else', async () => {
    expect(await foreignKeysOf('deities')).toEqual([
      { column: 'created_by', target: 'users' },
      { column: 'deleted_by', target: 'users' },
      { column: 'tradition_id', target: 'deity_traditions' },
      { column: 'updated_by', target: 'users' },
    ]);
  });

  describe('tradition_id', () => {
    it('rejects an insert that omits it', async () => {
      const error = await failureOf(sql`
        insert into deities (name, slug, description, created_by, updated_by)
        values ('Fixturia', 'fixturia', 'Goddess of the test run.', ${AUTHOR}, ${AUTHOR})
      `);

      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('tradition_id');
    });

    // The accepting case below is what proves the refusal is the foreign key's.
    it('rejects a tradition id no tradition holds', async () => {
      const error = await failureOf(insertDeity(ABSENT_TRADITION));

      // 23503 is foreign_key_violation.
      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(DEITIES_TRADITION_FK);
    });

    it('accepts a tradition id an existing tradition holds', async () => {
      const tradition = await insertTradition();

      const deity = await insertDeity(tradition);

      const [row] = await sql`select tradition_id from deities where id = ${deity}`;
      expect(row.tradition_id).toBe(tradition);
    });
  });

  describe('slug uniqueness', () => {
    it('rejects a second live deity sharing a slug', async () => {
      const tradition = await insertTradition();
      await insertDeity(tradition);
      const error = await failureOf(insertDeity(tradition, { name: 'Fixturia the Elder' }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(DEITIES_SLUG_UNIQUE);
    });

    it('frees the slug once the holder is soft-deleted', async () => {
      const tradition = await insertTradition();
      const first = await insertDeity(tradition);
      await softDelete('deities', first);

      const second = await insertDeity(tradition, { name: 'Fixturia the Elder' });

      const rows = await sql`select id, deleted_at from deities`;
      expect(rows.map((r) => r.id).sort()).toEqual([first, second].sort());
      expect(rows.find((r) => r.id === first)?.deleted_at).not.toBeNull();
      expect(rows.find((r) => r.id === second)?.deleted_at).toBeNull();
    });

    // Global rather than per tradition, as `ingredient_forms_slug_unique` is:
    // the seed's idempotency key reads the slug alone.
    it('rejects a shared slug across two different traditions', async () => {
      const testorian = await insertTradition();
      const mockish = await insertTradition({ name: 'Mockish', slug: 'mockish' });
      await insertDeity(testorian);

      const error = await failureOf(insertDeity(mockish));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(DEITIES_SLUG_UNIQUE);
    });
  });

  // The deliberate gap: uniqueness is on the slug alone, so two live deities
  // may share a display name — one god honoured under two traditions — and the
  // autofill shows the tradition beside each. A `name` index would supersede
  // that; say so rather than deleting this test.
  it('permits two live deities to share a display name, told apart by their tradition', async () => {
    const testorian = await insertTradition();
    const mockish = await insertTradition({ name: 'Mockish', slug: 'mockish' });

    await insertDeity(testorian);
    await insertDeity(mockish, { slug: 'fixturia-mockish' });

    const rows = await sql`
      select d.name, t.name as tradition_name
      from deities d join deity_traditions t on t.id = d.tradition_id
      order by t.name
    `;
    expect(rows.map((r) => r.name)).toEqual(['Fixturia', 'Fixturia']);
    expect(rows.map((r) => r.tradition_name)).toEqual(['Mockish', 'Testorian']);
  });

  it('indexes name and description for trigram matching in one gin index', async () => {
    const index = await catalogue.indexRow('deities', DEITIES_TRGM);

    expect(index?.unique).toBe(false);
    expect(index?.predicate).toBeNull();
    expect(index?.definition).toContain('USING gin (name gin_trgm_ops, description gin_trgm_ops)');
  });

  it('requires the name, slug and description', async () => {
    const tradition = await insertTradition();

    for (const column of ['name', 'slug', 'description']) {
      const error = await failureOf(insertDeity(tradition, { [column]: null }));

      expect(error.code).toBe('23502');
      expect(error.column_name).toBe(column);
    }
  });

  // A curated value exists to explain itself, and the description is search
  // surface: it carries the other spellings a reader types.
  it('rejects a blank description', async () => {
    const tradition = await insertTradition();

    for (const blank of ['', '   ']) {
      const error = await failureOf(insertDeity(tradition, { description: blank }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe('deities_description_not_blank');
    }
  });
});

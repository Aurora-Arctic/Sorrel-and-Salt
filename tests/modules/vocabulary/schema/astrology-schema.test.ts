import { beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { foreignKeyStatements, shippedMigrationStatements } from '../../../support/db/migrations';
import { planets, zodiacSigns } from '@/modules/vocabulary/schema/astrology';
import { ingredients } from '@/modules/ingredients/schema/ingredients';
import { FIXTURE_USERS } from '@/db/seed/standard';
import type { Row } from './types';

// As in ingredient-forms-schema.test.ts: a hand-ordering column under any usual name; §5 lists none.
const ORDERING_COLUMNS = ['order', 'position', 'sort', 'sort_order', 'rank', 'display_order'];

const AUTHOR = FIXTURE_USERS.A.id;

// Invented values, so no row here collides with what MB.93 seeds.
const VOCABULARIES = [
  {
    table: planets,
    name: 'planets',
    column: 'planets',
    row: { name: 'Testara', slug: 'testara', description: 'A body read only by fixtures.' },
    rename: 'Testara Minor',
  },
  {
    table: zodiacSigns,
    name: 'zodiac_signs',
    column: 'zodiac_signs',
    row: { name: 'Fixturus', slug: 'fixturus', description: 'A sign read only by fixtures.' },
    rename: 'Fixturus Rising',
  },
] as const;

describe.each(VOCABULARIES)('$name schema', ({ table, name }) => {
  const { byName, byIndexName, nonAuditForeignKeys } = tableFacts(table);

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'name', 'slug', 'description', ...AUDIT_COLUMNS].sort(),
    );
  });

  it('requires the name, slug and description every row carries', () => {
    for (const column of ['name', 'slug', 'description']) {
      expect(byName[column].notNull).toBe(true);
    }
  });

  // One tier, uncoloured, unordered and global
  // (claude-docs/db/astrology-vocabularies.md, "The astrology vocabularies").
  it('carries no group, colour, ordering column or workspace scoping', () => {
    expect(byName.group_id).toBeUndefined();
    expect(byName.workspace_id).toBeUndefined();
    expect(Object.keys(byName).filter((column) => column.includes('color'))).toEqual([]);
    for (const column of ORDERING_COLUMNS) {
      expect(byName[column]).toBeUndefined();
    }
    expect(nonAuditForeignKeys).toEqual([]);
  });

  it('makes the slug index unique and partial on deleted_at IS NULL (rule 4)', () => {
    const slugIndex = byIndexName[`${name}_slug_unique`];

    expect(slugIndex).toBeDefined();
    expect(slugIndex.config.unique).toBe(true);
    expect(slugIndex.config.where).toBeDefined();
  });

  it('declares one gin trigram index over name and description, neither unique nor partial', () => {
    const trigram = byIndexName[`${name}_trgm`];

    expect(trigram.config.method).toBe('gin');
    expect(trigram.config.columns).toHaveLength(2);
    expect(trigram.config.unique).toBe(false);
    expect(trigram.config.where).toBeUndefined();
    expect(Object.keys(byIndexName).sort()).toEqual([`${name}_slug_unique`, `${name}_trgm`]);
  });
});

// §5: the lists are free text over these vocabularies, as `form` is over
// `ingredient_forms` — an FK would make an uncurated value unwritable.
describe.each(VOCABULARIES)(
  'ingredients.$column is a text list over $name, not a foreign key to it',
  ({ table, name, column }) => {
    it(`declares ${column} as a nullable text[] column`, () => {
      const declared = tableFacts(ingredients).columns.find((c) => c.name === column);

      expect(declared).toBeDefined();
      expect(declared?.getSQLType()).toBe('text[]');
      expect(declared?.notNull).toBe(false);
    });

    it(`points no ingredients foreign key at ${name}`, () => {
      const referenced = tableFacts(ingredients).foreignKeys.map(
        (fk) => fk.reference().foreignTable,
      );

      expect(referenced).not.toContain(table);
    });

    // Read from disk: a hand-edited migration could add a key the schema lacks.
    it('ships no migration adding such a foreign key', () => {
      expect(foreignKeyStatements(shippedMigrationStatements(), 'ingredients', name)).toEqual([]);
    });
  },
);

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));

beforeEach(async () => {
  await sql`truncate planets, zodiac_signs cascade`;
});

describe.each(VOCABULARIES)('$name table', ({ name, row, rename }) => {
  function fullRow(overrides: Row = {}): Row {
    return { ...row, created_by: AUTHOR, updated_by: AUTHOR, ...overrides };
  }

  async function insert(overrides: Row = {}): Promise<string> {
    const [inserted] = await sql`
      insert into ${sql(name)} ${sql(fullRow(overrides))} returning id
    `;
    return inserted.id as string;
  }

  it('carries exactly the §5 columns in the catalogue', async () => {
    expect((await catalogue.columnNames(name)).sort()).toEqual(
      ['id', 'name', 'slug', 'description', ...AUDIT_COLUMNS].sort(),
    );
  });

  // The catalogue's word, so a hand-edited migration cannot add a key the schema lacks.
  it('references nothing but users, through the audit stamps', async () => {
    const keys = await sql`
      select a.attname as column, c.confrelid::regclass::text as target
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
      where c.contype = 'f' and c.conrelid = ${name}::regclass
      order by a.attname
    `;

    expect(keys.map((key) => key.column)).toEqual(['created_by', 'deleted_by', 'updated_by']);
    expect(new Set(keys.map((key) => key.target))).toEqual(new Set(['users']));
  });

  it('indexes name and description for trigram matching in one gin index', async () => {
    const index = await catalogue.indexRow(name, `${name}_trgm`);

    expect(index?.unique).toBe(false);
    expect(index?.predicate).toBeNull();
    expect(index?.definition).toContain('USING gin (name gin_trgm_ops, description gin_trgm_ops)');
  });

  it('carries no unique index beyond the primary key and the slug', async () => {
    expect(await catalogue.uniqueIndexNames(name)).toEqual([`${name}_pkey`, `${name}_slug_unique`]);
  });

  describe('slug uniqueness', () => {
    it('rejects a second live row sharing a slug', async () => {
      await insert();
      const error = await failureOf(insert({ name: rename }));

      // 23505 is unique_violation, named: the index refused, not something earlier.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(`${name}_slug_unique`);
    });

    // The test above is the precondition: without the soft delete the second
    // insert is refused, so this pass is the predicate and not an empty table.
    it('frees the slug once the holder is soft-deleted', async () => {
      const first = await insert();
      await sql`
        update ${sql(name)} set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${first}
      `;

      const second = await insert({ name: rename });

      const rows = await sql`select id, deleted_at from ${sql(name)} order by created_at, id`;
      expect(rows.map((r) => r.id).sort()).toEqual([first, second].sort());
      expect(rows.find((r) => r.id === first)?.deleted_at).not.toBeNull();
      expect(rows.find((r) => r.id === second)?.deleted_at).toBeNull();
    });
  });

  it('requires the name, slug and description', async () => {
    for (const column of ['name', 'slug', 'description']) {
      const error = await failureOf(insert({ [column]: null }));

      // 23502 is not_null_violation on that exact column.
      expect(error.code).toBe('23502');
      expect(error.column_name).toBe(column);
    }
  });

  // NOT NULL alone accepts '' and '   ', and the description is search surface.
  it('rejects a blank description', async () => {
    for (const blank of ['', '   ']) {
      const error = await failureOf(insert({ description: blank }));

      // 23514 is check_violation.
      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(`${name}_description_not_blank`);
    }
  });
});

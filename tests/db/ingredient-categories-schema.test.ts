import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { and, eq } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { categories } from '@/db/schema/categories';
import { ingredientCategories } from '@/db/schema/ingredient-categories';
import { ingredients } from '@/db/schema/ingredients';
import { users } from '@/db/schema/users';
import { findMany, withAudit } from '@/db/repository';
import { FIXTURE_USERS } from '@/db/seed/standard';

const STAMP_COLUMNS = ['created_at', 'created_by', 'updated_at', 'updated_by'];
const DELETE_COLUMNS = ['deleted_at', 'deleted_by'];

const PRIMARY_KEY = 'ingredient_categories_ingredient_id_category_id_pk';
const REVERSE_INDEX = 'ingredient_categories_category_id_idx';
const INGREDIENT_FK = 'ingredient_categories_ingredient_id_ingredients_id_fk';
const CATEGORY_FK = 'ingredient_categories_category_id_categories_id_fk';

describe('ingredient_categories schema', () => {
  const { columns, indexes, primaryKeys, foreignKeys } = getTableConfig(ingredientCategories);
  const byName = Object.fromEntries(columns.map((c) => [c.name, c]));
  const foreignKeyByColumn = Object.fromEntries(
    foreignKeys.map((fk) => {
      const { columns: local, foreignColumns, foreignTable } = fk.reference();
      return [local[0].name, { foreignColumnName: foreignColumns[0].name, foreignTable }];
    }),
  );

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['ingredient_id', 'category_id', ...STAMP_COLUMNS].sort(),
    );
  });

  // Four stamps and no tombstone (MB.34) —
  // claude-docs/db.md, "Hard delete on the three join tables".
  it('spreads the four audit stamps, each required', () => {
    for (const column of STAMP_COLUMNS) {
      expect(byName[column]).toBeDefined();
      expect(byName[column].notNull).toBe(true);
    }
  });

  it('carries no delete columns: a removed pair leaves no row', () => {
    for (const column of DELETE_COLUMNS) {
      expect(byName[column]).toBeUndefined();
    }
  });

  // A surrogate id would let the same pair be assigned twice.
  it('has no surrogate id, keying on the pair instead', () => {
    expect(byName.id).toBeUndefined();

    const [key, ...rest] = primaryKeys;
    expect(rest).toEqual([]);
    expect(key.columns.map((column) => column.name)).toEqual(['ingredient_id', 'category_id']);
    expect(key.getName()).toBe(PRIMARY_KEY);
  });

  it('requires both sides of the pair', () => {
    expect(byName.ingredient_id.notNull).toBe(true);
    expect(byName.category_id.notNull).toBe(true);
  });

  it('points each side at its own table by foreign key', () => {
    expect(foreignKeyByColumn.ingredient_id.foreignTable).toBe(ingredients);
    expect(foreignKeyByColumn.ingredient_id.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.category_id.foreignTable).toBe(categories);
    expect(foreignKeyByColumn.category_id.foreignColumnName).toBe('id');
  });

  it('references users.id from every audit id (MB.5)', () => {
    for (const column of ['created_by', 'updated_by']) {
      expect(foreignKeyByColumn[column]).toBeDefined();
      expect(foreignKeyByColumn[column].foreignColumnName).toBe('id');
      expect(foreignKeyByColumn[column].foreignTable).toBe(users);
    }
    expect(foreignKeyByColumn.deleted_by).toBeUndefined();
  });

  // The key answers "what is this ingredient tagged with"; the reverse question
  // needs its own index, `category_id` leading.
  it('indexes the reverse direction, category to ingredient', () => {
    const reverse = indexes.find((index) => index.config.name === REVERSE_INDEX);

    expect(reverse).toBeDefined();
    expect(reverse?.config.unique).toBe(false);
    expect(reverse?.config.columns.map((column) => (column as { name: string }).name)).toEqual([
      'category_id',
      'ingredient_id',
    ]);
  });

  // No tombstone, so there is no soft-delete predicate to write.
  it('carries no partial index: there is no soft-delete predicate to write', () => {
    for (const index of indexes) {
      expect(index.config.where).toBeUndefined();
    }
  });
});

const AUTHOR = FIXTURE_USERS.A.id;
const SECOND_AUTHOR = FIXTURE_USERS.B.id;
let MUGWORT: string;
let ROSEMARY: string;
let PROTECTION: string;
let CLEANSING: string;
const ABSENT = '99999999-9999-9999-9999-999999999999';

let sql: ReturnType<typeof postgres>;

async function compendiumIdOf(canonicalName: string): Promise<string> {
  const [found] = await sql`
    select id from ingredients
    where workspace_id is null and canonical_name = ${canonicalName} and deleted_at is null
  `;
  if (!found) throw new Error(`The standard seed carries no compendium row for ${canonicalName}`);
  return found.id as string;
}

async function categoryIdOf(name: string): Promise<string> {
  const [found] = await sql`
    select id from categories where name = ${name} and deleted_at is null
  `;
  if (!found) throw new Error(`The standard seed carries no category named ${name}`);
  return found.id as string;
}

async function assign(ingredientId: string, categoryId: string, author = AUTHOR): Promise<void> {
  await sql`
    insert into ingredient_categories (ingredient_id, category_id, created_by, updated_by)
    values (${ingredientId}, ${categoryId}, ${author}, ${author})
  `;
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
  return rows.map((r) => r.column_name as string);
}

type Pair = { ingredientId: string; categoryId: string };

async function pairs(): Promise<Pair[]> {
  const rows = await sql`
    select ingredient_id, category_id from ingredient_categories
    order by ingredient_id, category_id
  `;
  return rows.map((row) => ({
    ingredientId: row.ingredient_id as string,
    categoryId: row.category_id as string,
  }));
}

// Sorted as `pairs()` reads: the seed generates the ids, and a uuid orders
// bytewise, which for its lowercase text is plain string comparison.
function inPairOrder(expected: Pair[]): Pair[] {
  const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return [...expected].sort(
    (a, b) => compare(a.ingredientId, b.ingredientId) || compare(a.categoryId, b.categoryId),
  );
}

async function indexDefinition(name: string): Promise<{ unique: boolean; definition: string }> {
  const [found] = await sql`
    select i.indisunique as unique, pg_get_indexdef(i.indexrelid) as definition
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    where i.indrelid = 'ingredient_categories'::regclass and c.relname = ${name}
  `;
  return found as unknown as { unique: boolean; definition: string };
}

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });

  MUGWORT = await compendiumIdOf('Artemisia vulgaris');
  ROSEMARY = await compendiumIdOf('Salvia rosmarinus');
  PROTECTION = await categoryIdOf('Protection');
  CLEANSING = await categoryIdOf('Cleansing');
});

beforeEach(async () => {
  await sql`truncate ingredient_categories`;
});

afterAll(async () => {
  await sql.end();
});

describe('ingredient_categories table', () => {
  it('carries the four stamp columns and neither delete column', async () => {
    expect(await columnNames('ingredient_categories')).toEqual(
      ['ingredient_id', 'category_id', ...STAMP_COLUMNS].sort(),
    );
  });

  describe('the composite primary key', () => {
    // Story 22, and the precondition for the refusal below: several categories
    // insert fine, so the key on the pair is what stops the duplicate.
    it('lets an ingredient carry several categories, and a category several ingredients', async () => {
      await assign(MUGWORT, PROTECTION);
      await assign(MUGWORT, CLEANSING);
      await assign(ROSEMARY, PROTECTION);

      expect(await pairs()).toEqual(
        inPairOrder([
          { ingredientId: MUGWORT, categoryId: PROTECTION },
          { ingredientId: MUGWORT, categoryId: CLEANSING },
          { ingredientId: ROSEMARY, categoryId: PROTECTION },
        ]),
      );
    });

    it('refuses to assign the same category to the same ingredient twice', async () => {
      await assign(MUGWORT, PROTECTION);

      const error = await failureOf(assign(MUGWORT, PROTECTION));

      // 23505 is unique_violation, named: the primary key refused, not something earlier.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(PRIMARY_KEY);
    });

    // The pair is the identity: a second member toggling the same chip is the same row.
    it('refuses the duplicate whoever is adding it', async () => {
      await assign(MUGWORT, PROTECTION);

      const error = await failureOf(assign(MUGWORT, PROTECTION, SECOND_AUTHOR));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(PRIMARY_KEY);
    });
  });

  describe('both sides are real rows', () => {
    it('refuses an ingredient id no ingredient holds', async () => {
      const error = await failureOf(assign(ABSENT, PROTECTION));

      // 23503 is foreign_key_violation.
      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(INGREDIENT_FK);
    });

    it('refuses a category id no category holds', async () => {
      const error = await failureOf(assign(MUGWORT, ABSENT));

      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(CATEGORY_FK);
    });

    it('refuses an insert omitting the ingredient', async () => {
      const error = await failureOf(sql`
        insert into ingredient_categories (category_id, created_by, updated_by)
        values (${PROTECTION}, ${AUTHOR}, ${AUTHOR})
      `);

      // 23502 is not_null_violation on that exact column.
      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('ingredient_id');
    });

    it('refuses an insert omitting the category', async () => {
      const error = await failureOf(sql`
        insert into ingredient_categories (ingredient_id, created_by, updated_by)
        values (${MUGWORT}, ${AUTHOR}, ${AUTHOR})
      `);

      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('category_id');
    });
  });

  // Without the reverse index a category filter is a sequential scan over
  // every assignment in the database.
  describe('lookup in both directions', () => {
    it('indexes the pair from the ingredient side, as the primary key', async () => {
      const index = await indexDefinition(PRIMARY_KEY);

      expect(index).toBeDefined();
      expect(index.unique).toBe(true);
      expect(index.definition).toContain('(ingredient_id, category_id)');
    });

    it('indexes the pair from the category side too', async () => {
      const index = await indexDefinition(REVERSE_INDEX);

      expect(index).toBeDefined();
      // Not unique: a unique index here would refuse a category its second ingredient.
      expect(index.unique).toBe(false);
      expect(index.definition).toContain('(category_id, ingredient_id)');
    });
  });
});

// `write.delete` against the real table rather than repository.test.ts's scratch pair.
describe('a pair removed through write.delete', () => {
  const session = { userId: AUTHOR };

  const isPair = (ingredientId: string, categoryId: string) =>
    and(
      eq(ingredientCategories.ingredientId, ingredientId),
      eq(ingredientCategories.categoryId, categoryId),
    ) as ReturnType<typeof eq>;

  const add = (ingredientId: string, categoryId: string, author = AUTHOR) =>
    withAudit({ userId: author }, (write) =>
      write.insert(ingredientCategories, { ingredientId, categoryId }),
    );

  const remove = (ingredientId: string, categoryId: string) =>
    withAudit(session, (write) =>
      write.delete(ingredientCategories, isPair(ingredientId, categoryId)),
    );

  it('is deleted outright, leaving no row to filter out', async () => {
    await add(MUGWORT, PROTECTION);

    const removed = await remove(MUGWORT, PROTECTION);

    expect(removed).toHaveLength(1);
    expect(await pairs()).toEqual([]);
    // `findMany` writes no `deleted_at IS NULL` for this table, so an empty
    // read is an empty table.
    expect(await findMany(ingredientCategories)).toEqual([]);
  });

  it('can be re-added afterwards, with no partial index to make it possible', async () => {
    await add(MUGWORT, PROTECTION);
    await remove(MUGWORT, PROTECTION);

    const [readded] = await add(MUGWORT, PROTECTION, SECOND_AUTHOR);

    expect(await pairs()).toEqual([{ ingredientId: MUGWORT, categoryId: PROTECTION }]);
    // An ordinary insert: the stamps are the second member's, not the first
    // author's resurrected.
    expect(readded.createdBy).toBe(SECOND_AUTHOR);
  });

  it('leaves the ingredient other categories alone', async () => {
    await add(MUGWORT, PROTECTION);
    await add(MUGWORT, CLEANSING);

    await remove(MUGWORT, PROTECTION);

    expect(await pairs()).toEqual([{ ingredientId: MUGWORT, categoryId: CLEANSING }]);
  });
});

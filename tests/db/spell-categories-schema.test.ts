import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { and, eq } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { makeSpell, spellColumns } from '../support/fixtures';
import { categories } from '@/db/schema/categories';
import { spellCategories } from '@/db/schema/spell-categories';
import { spells } from '@/db/schema/spells';
import { users } from '@/db/schema/users';
import { findMany, withAudit } from '@/db/repository';
import { FIXTURE_USERS } from '@/db/seed/standard';

const STAMP_COLUMNS = ['created_at', 'created_by', 'updated_at', 'updated_by'];
const DELETE_COLUMNS = ['deleted_at', 'deleted_by'];

// DESIGN.md §5's column list, transcribed.
const OWN_COLUMNS = ['spell_id', 'category_id'];

const PRIMARY_KEY = 'spell_categories_spell_id_category_id_pk';
const REVERSE_INDEX = 'spell_categories_category_id_idx';
const SPELL_FK = 'spell_categories_spell_id_spells_id_fk';
const CATEGORY_FK = 'spell_categories_category_id_categories_id_fk';

describe('spell_categories schema', () => {
  const { columns, indexes, primaryKeys, foreignKeys, checks } = getTableConfig(spellCategories);
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
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...STAMP_COLUMNS].sort());
  });

  // MB.34: the four stamps, not the six. `created_by` still answers who tagged
  // this spell with this intent; what goes is the tombstone, because a chip
  // toggled off leaves no row.
  it('spreads the four audit stamps, each required', () => {
    for (const column of STAMP_COLUMNS) {
      expect(byName[column]).toBeDefined();
      expect(byName[column].notNull).toBe(true);
    }
  });

  it('carries no delete columns: a removed assignment leaves no row', () => {
    for (const column of DELETE_COLUMNS) {
      expect(byName[column]).toBeUndefined();
    }
  });

  // A surrogate id would let the same pair be assigned twice, which is exactly
  // what the composite key exists to refuse — as on `ingredient_categories`,
  // `spell_ingredients` and `workspace_members`.
  it('has no surrogate id, keying on the pair instead', () => {
    expect(byName.id).toBeUndefined();

    const [key, ...rest] = primaryKeys;
    expect(rest).toEqual([]);
    expect(key.columns.map((column) => column.name)).toEqual(['spell_id', 'category_id']);
    expect(key.getName()).toBe(PRIMARY_KEY);
  });

  it('requires both sides of the pair', () => {
    expect(byName.spell_id.notNull).toBe(true);
    expect(byName.category_id.notNull).toBe(true);
  });

  it('points each side at its own table by foreign key', () => {
    expect(foreignKeyByColumn.spell_id.foreignTable).toBe(spells);
    expect(foreignKeyByColumn.spell_id.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.spell_id.name).toBe(SPELL_FK);
    expect(foreignKeyByColumn.category_id.foreignTable).toBe(categories);
    expect(foreignKeyByColumn.category_id.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.category_id.name).toBe(CATEGORY_FK);
  });

  it('references users.id from every audit id (MB.5)', () => {
    for (const column of ['created_by', 'updated_by']) {
      expect(foreignKeyByColumn[column]).toBeDefined();
      expect(foreignKeyByColumn[column].foreignColumnName).toBe('id');
      expect(foreignKeyByColumn[column].foreignTable).toBe(users);
    }
    // The delete stamp every audited table carries has no counterpart here.
    expect(foreignKeyByColumn.deleted_by).toBeUndefined();
  });

  // The primary key indexes (spell_id, category_id), which answers "what is
  // this spell tagged with"; the reverse question — "which spells are tagged
  // for prosperity", M10.11's category filter — needs its own index,
  // `category_id` leading.
  it('indexes the reverse direction, category to spell', () => {
    const reverse = indexes.find((index) => index.config.name === REVERSE_INDEX);

    expect(reverse).toBeDefined();
    expect(reverse?.config.unique).toBe(false);
    expect(reverse?.config.columns.map((column) => (column as { name: string }).name)).toEqual([
      'category_id',
      'spell_id',
    ]);
  });

  // Rule 4's partial-index convention exists to stop a tombstone reserving a
  // name, and this table has no tombstone to dodge: the pair is either there or
  // it is not. A `WHERE deleted_at IS NULL` here would not even compile.
  it('carries no partial index: there is no soft-delete predicate to write', () => {
    for (const index of indexes) {
      expect(index.config.where).toBeUndefined();
    }
  });

  // §5 names none, and the pair is fully constrained by the key and the two
  // foreign keys — there is nothing about an assignment left to check.
  it('carries no CHECK constraints', () => {
    expect(checks).toEqual([]);
  });
});

// The behaviour half, against the real table: a clone carrying every migration
// and the `standard` seed, re-cloned before this file runs
// (tests/support/db-setup.ts). The authors and the categories are the seed's —
// the real `users` and `categories` demand NOT NULL names, slugs and audit
// stamps. The two spells are this file's own, because `standard` seeds none.
const AUTHOR = FIXTURE_USERS.A.id;
const SECOND_AUTHOR = FIXTURE_USERS.B.id;
const ABSENT = '99999999-9999-9999-9999-999999999999';

let sql: ReturnType<typeof postgres>;
// Read back in `beforeAll`: §6's category ids are generated at seed time, and a
// spell's id is the column default's.
let HEARTH_GUARD: string;
let SWEET_JAR: string;
let PROTECTION: string;
let PROSPERITY: string;

async function recordSpell(title: string): Promise<string> {
  const [inserted] = await sql`
    insert into spells ${sql({ ...spellColumns(makeSpell({ title })), created_by: AUTHOR, updated_by: AUTHOR })}
    returning id
  `;
  return inserted.id as string;
}

async function categoryIdNamed(name: string): Promise<string> {
  const [found] = await sql`select id from categories where name = ${name}`;
  if (!found) throw new Error(`The standard seed carries no category named ${name}`);
  return found.id as string;
}

async function assign(spellId: string, categoryId: string, author = AUTHOR): Promise<void> {
  await sql`
    insert into spell_categories (spell_id, category_id, created_by, updated_by)
    values (${spellId}, ${categoryId}, ${author}, ${author})
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
  return rows.map((row) => row.column_name as string);
}

interface Pair {
  spellId: string;
  categoryId: string;
}

async function pairs(): Promise<Pair[]> {
  const rows = await sql`
    select spell_id, category_id from spell_categories order by spell_id, category_id
  `;
  return rows.map((row) => ({
    spellId: row.spell_id as string,
    categoryId: row.category_id as string,
  }));
}

// The order `pairs()` reads them back in. Since M1.27 the ids are generated
// rather than fixed, so a list of expected pairs is sorted the same way
// instead of relying on the ids sorting in the order they were written.
function inReadOrder(expected: Pair[]): Pair[] {
  return [...expected].sort(
    (a, b) => a.spellId.localeCompare(b.spellId) || a.categoryId.localeCompare(b.categoryId),
  );
}

async function indexDefinition(name: string): Promise<{ unique: boolean; definition: string }> {
  const [found] = await sql`
    select i.indisunique as unique, pg_get_indexdef(i.indexrelid) as definition
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    where i.indrelid = 'spell_categories'::regclass and c.relname = ${name}
  `;
  return found as unknown as { unique: boolean; definition: string };
}

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });

  HEARTH_GUARD = await recordSpell('Hearth Guard');
  SWEET_JAR = await recordSpell('Sweet Jar');
  PROTECTION = await categoryIdNamed('Protection');
  PROSPERITY = await categoryIdNamed('Prosperity');
});

// Nothing references an assignment, so a plain truncate is enough; the empty
// table is what every test below assumes.
beforeEach(async () => {
  await sql`truncate spell_categories`;
});

afterAll(async () => {
  await sql.end();
});

describe('spell_categories table', () => {
  it('carries the four stamp columns and neither delete column', async () => {
    expect(await columnNames('spell_categories')).toEqual(
      [...OWN_COLUMNS, ...STAMP_COLUMNS].sort(),
    );
  });

  describe('the composite primary key', () => {
    // Story 48, and the precondition for the refusal below: several intents per
    // spell insert fine, so what stops the duplicate is the key on the pair
    // rather than the insert never working at all.
    it('lets a spell carry several categories, and a category several spells', async () => {
      await assign(HEARTH_GUARD, PROTECTION);
      await assign(HEARTH_GUARD, PROSPERITY);
      await assign(SWEET_JAR, PROSPERITY);

      expect(await pairs()).toEqual(
        inReadOrder([
          { spellId: HEARTH_GUARD, categoryId: PROTECTION },
          { spellId: HEARTH_GUARD, categoryId: PROSPERITY },
          { spellId: SWEET_JAR, categoryId: PROSPERITY },
        ]),
      );
    });

    it('refuses to assign the same category to the same spell twice', async () => {
      await assign(HEARTH_GUARD, PROTECTION);

      const error = await failureOf(assign(HEARTH_GUARD, PROTECTION));

      // 23505 is unique_violation, named: proof the insert reached the primary
      // key rather than failing some other constraint first.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(PRIMARY_KEY);
    });

    // The pair is the identity; the stamps are only who touched it. A second
    // member toggling the same chip on is the same row, not a second one.
    it('refuses the duplicate whoever is adding it', async () => {
      await assign(HEARTH_GUARD, PROTECTION);

      const error = await failureOf(assign(HEARTH_GUARD, PROTECTION, SECOND_AUTHOR));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(PRIMARY_KEY);
    });
  });

  describe('both sides are real rows', () => {
    it('refuses a spell id no spell holds', async () => {
      const error = await failureOf(assign(ABSENT, PROTECTION));

      // 23503 is foreign_key_violation.
      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(SPELL_FK);
    });

    it('refuses a category id no category holds', async () => {
      const error = await failureOf(assign(HEARTH_GUARD, ABSENT));

      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(CATEGORY_FK);
    });

    // Which table each key names, proved rather than asserted twice: the same
    // id is a real row on one side and refused on the other. Repoint either key
    // and this is the test that reddens — an id that exists *somewhere* is the
    // failure a foreign key to the wrong table lets through.
    it('refuses a real category id in the spell column', async () => {
      const error = await failureOf(assign(PROTECTION, PROTECTION));

      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(SPELL_FK);
      // Why it could have succeeded: that id is a live category, and the same
      // insert with it on the category side alone is accepted.
      await assign(HEARTH_GUARD, PROTECTION);
      expect(await pairs()).toEqual([{ spellId: HEARTH_GUARD, categoryId: PROTECTION }]);
    });

    it('refuses a real spell id in the category column', async () => {
      const error = await failureOf(assign(HEARTH_GUARD, HEARTH_GUARD));

      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(CATEGORY_FK);
      await assign(HEARTH_GUARD, PROTECTION);
      expect(await pairs()).toEqual([{ spellId: HEARTH_GUARD, categoryId: PROTECTION }]);
    });

    // 23502 is not_null_violation on that exact column. The refusal is the
    // composite key's rather than the column's own `NOT NULL`: a primary key
    // column is implicitly non-null, so stripping the explicit declaration
    // changes nothing here. The declaration stays because it matches the other
    // two join tables and says what the column means, and these two tests
    // assert the shipped behaviour rather than which constraint produced it.
    it('refuses an insert omitting the spell', async () => {
      const error = await failureOf(sql`
        insert into spell_categories (category_id, created_by, updated_by)
        values (${PROTECTION}, ${AUTHOR}, ${AUTHOR})
      `);

      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('spell_id');
    });

    it('refuses an insert omitting the category', async () => {
      const error = await failureOf(sql`
        insert into spell_categories (spell_id, created_by, updated_by)
        values (${HEARTH_GUARD}, ${AUTHOR}, ${AUTHOR})
      `);

      // Same as above: the key's implicit non-nullability, named.
      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('category_id');
    });
  });

  // Both directions, asserted from the catalogue: a chip section on a spell
  // page reads the pair one way, and M10.11's category filter reads it the
  // other. The primary key covers the first; without the second index the
  // grimoire filter is a sequential scan over every assignment in the database.
  describe('lookup in both directions', () => {
    it('indexes the pair from the spell side, as the primary key', async () => {
      const index = await indexDefinition(PRIMARY_KEY);

      expect(index).toBeDefined();
      expect(index.unique).toBe(true);
      expect(index.definition).toContain('(spell_id, category_id)');
    });

    it('indexes the pair from the category side too', async () => {
      const index = await indexDefinition(REVERSE_INDEX);

      expect(index).toBeDefined();
      // Not unique: the pair's uniqueness is the primary key's job, and a
      // unique index here would refuse a category its second spell.
      expect(index.unique).toBe(false);
      expect(index.definition).toContain('(category_id, spell_id)');
    });
  });
});

// MB.34's type constraints exercised against the real table rather than
// `repository.test.ts`'s scratch pair: `write.delete` compiles against this one
// because it carries no `deletedAt`, and what it leaves behind is nothing.
describe('an assignment removed through write.delete', () => {
  const session = { userId: AUTHOR };

  const isPair = (spellId: string, categoryId: string) =>
    and(
      eq(spellCategories.spellId, spellId),
      eq(spellCategories.categoryId, categoryId),
    ) as ReturnType<typeof eq>;

  const add = (spellId: string, categoryId: string, author = AUTHOR) =>
    withAudit({ userId: author }, (write) =>
      write.insert(spellCategories, { spellId, categoryId }),
    );

  const remove = (spellId: string, categoryId: string) =>
    withAudit(session, (write) => write.delete(spellCategories, isPair(spellId, categoryId)));

  it('is deleted outright, leaving no row to filter out', async () => {
    await add(HEARTH_GUARD, PROTECTION);

    const removed = await remove(HEARTH_GUARD, PROTECTION);

    expect(removed).toHaveLength(1);
    expect(await pairs()).toEqual([]);
    // Not merely filtered out of the finder: `findMany` writes no
    // `deleted_at IS NULL` for a table that has no such column, so an empty
    // read here is an empty table.
    expect(await findMany(spellCategories)).toEqual([]);
  });

  it('can be re-added afterwards, with no partial index to make it possible', async () => {
    await add(HEARTH_GUARD, PROTECTION);
    await remove(HEARTH_GUARD, PROTECTION);

    const [readded] = await add(HEARTH_GUARD, PROTECTION, SECOND_AUTHOR);

    expect(await pairs()).toEqual([{ spellId: HEARTH_GUARD, categoryId: PROTECTION }]);
    // Re-adding is an ordinary insert, so the row's stamps are the second
    // member's — not the first author's, resurrected.
    expect(readded.createdBy).toBe(SECOND_AUTHOR);
  });

  it('leaves the spell other intents alone', async () => {
    await add(HEARTH_GUARD, PROTECTION);
    await add(HEARTH_GUARD, PROSPERITY);

    await remove(HEARTH_GUARD, PROTECTION);

    expect(await pairs()).toEqual([{ spellId: HEARTH_GUARD, categoryId: PROSPERITY }]);
  });
});

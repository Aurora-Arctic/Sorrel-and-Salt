import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from './support/database';
import { STAMP_COLUMNS, tableFacts } from './support/table-metadata';
import { and, eq } from 'drizzle-orm';
import { makeSpell, spellColumns } from '../support/fixtures';
import { categories } from '@/db/schema/categories';
import { spellCategories } from '@/db/schema/spell-categories';
import { spells } from '@/db/schema/spells';
import { findMany, withAudit } from '@/db/repository';
import { FIXTURE_USERS } from '@/db/seed/standard';

// DESIGN.md §5's column list, transcribed.
const OWN_COLUMNS = ['spell_id', 'category_id'];

const PRIMARY_KEY = 'spell_categories_spell_id_category_id_pk';
const REVERSE_INDEX = 'spell_categories_category_id_idx';
const SPELL_FK = 'spell_categories_spell_id_spells_id_fk';
const CATEGORY_FK = 'spell_categories_category_id_categories_id_fk';

describe('spell_categories schema', () => {
  const { byName, indexes, primaryKeys, checks, foreignKeyByColumn } = tableFacts(spellCategories);

  // Four stamps and no tombstone (MB.34): a removed assignment leaves no row —
  // claude-docs/db.md, "Hard delete on the three join tables".
  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...STAMP_COLUMNS].sort());
  });

  // A surrogate id would let the same pair be assigned twice.
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

  // The key answers "what is this spell tagged with"; the category filter needs
  // its own index, `category_id` leading.
  it('indexes the reverse direction, category to spell', () => {
    const reverse = indexes.find((index) => index.config.name === REVERSE_INDEX);

    expect(reverse).toBeDefined();
    expect(reverse?.config.unique).toBe(false);
    expect(reverse?.config.columns.map((column) => (column as { name: string }).name)).toEqual([
      'category_id',
      'spell_id',
    ]);
  });

  // No tombstone, so there is no soft-delete predicate to write.
  it('carries no partial index: there is no soft-delete predicate to write', () => {
    for (const index of indexes) {
      expect(index.config.where).toBeUndefined();
    }
  });

  // §5 names none: the key and the two foreign keys leave nothing about a pair to check.
  it('carries no CHECK constraints', () => {
    expect(checks).toEqual([]);
  });
});

// The two spells are this file's own, because `standard` seeds none.
const AUTHOR = FIXTURE_USERS.A.id;
const SECOND_AUTHOR = FIXTURE_USERS.B.id;
const ABSENT = '99999999-9999-9999-9999-999999999999';

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));
// Read back in `beforeAll`: the seed generates the category ids.
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

// Sorted as `pairs()` reads: the ids are generated, so their order is unknown when written.
function inReadOrder(expected: Pair[]): Pair[] {
  return [...expected].sort(
    (a, b) => a.spellId.localeCompare(b.spellId) || a.categoryId.localeCompare(b.categoryId),
  );
}

beforeAll(async () => {
  HEARTH_GUARD = await recordSpell('Hearth Guard');
  SWEET_JAR = await recordSpell('Sweet Jar');
  PROTECTION = await categoryIdNamed('Protection');
  PROSPERITY = await categoryIdNamed('Prosperity');
});

beforeEach(async () => {
  await sql`truncate spell_categories`;
});

describe('spell_categories table', () => {
  it('carries the four stamp columns and neither delete column', async () => {
    expect(await catalogue.columnNames('spell_categories')).toEqual(
      [...OWN_COLUMNS, ...STAMP_COLUMNS].sort(),
    );
  });

  describe('the composite primary key', () => {
    // Story 48, and the precondition for the refusal below: several intents
    // insert fine, so the key on the pair is what stops the duplicate.
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

      // 23505 is unique_violation, named: the primary key refused, not something earlier.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(PRIMARY_KEY);
    });

    // The pair is the identity: a second member toggling the same chip is the same row.
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

    // Which table each key names, proved: the same id is a real row on one
    // side and refused on the other.
    it('refuses a real category id in the spell column', async () => {
      const error = await failureOf(assign(PROTECTION, PROTECTION));

      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(SPELL_FK);
      // Why it could have succeeded: the id is a live category, accepted on that side.
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

    // 23502 is not_null_violation. The refusal is the composite key's implicit
    // NOT NULL; the explicit declaration stays to match the other join tables,
    // and these assert the shipped behaviour rather than which constraint.
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

      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('category_id');
    });
  });

  // Without the reverse index the grimoire's category filter is a sequential
  // scan over every assignment in the database.
  describe('lookup in both directions', () => {
    it('indexes the pair from the spell side, as the primary key', async () => {
      const index = await catalogue.indexRow('spell_categories', PRIMARY_KEY);

      expect(index).toBeDefined();
      expect(index?.unique).toBe(true);
      expect(index?.definition).toContain('(spell_id, category_id)');
    });

    it('indexes the pair from the category side too', async () => {
      const index = await catalogue.indexRow('spell_categories', REVERSE_INDEX);

      expect(index).toBeDefined();
      // Not unique: a unique index here would refuse a category its second spell.
      expect(index?.unique).toBe(false);
      expect(index?.definition).toContain('(category_id, spell_id)');
    });
  });
});

// `write.delete` against the real table rather than repository.test.ts's scratch pair.
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
    // `findMany` writes no `deleted_at IS NULL` for this table, so an empty
    // read is an empty table.
    expect(await findMany(spellCategories)).toEqual([]);
  });

  it('can be re-added afterwards, with no partial index to make it possible', async () => {
    await add(HEARTH_GUARD, PROTECTION);
    await remove(HEARTH_GUARD, PROTECTION);

    const [readded] = await add(HEARTH_GUARD, PROTECTION, SECOND_AUTHOR);

    expect(await pairs()).toEqual([{ spellId: HEARTH_GUARD, categoryId: PROTECTION }]);
    // An ordinary insert: the stamps are the second member's, not the first
    // author's resurrected.
    expect(readded.createdBy).toBe(SECOND_AUTHOR);
  });

  it('leaves the spell other intents alone', async () => {
    await add(HEARTH_GUARD, PROTECTION);
    await add(HEARTH_GUARD, PROSPERITY);

    await remove(HEARTH_GUARD, PROTECTION);

    expect(await pairs()).toEqual([{ spellId: HEARTH_GUARD, categoryId: PROSPERITY }]);
  });
});

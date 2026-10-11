import { beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertSpell } from '../../../support/db/insert-spell';
import { STAMP_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { makeIngredient, makeSpell } from '../../../support/fixtures';
import { ingredientCategories } from '@/modules/ingredients/schema/ingredient-categories';
import { spellCategories } from '@/modules/grimoire/schema/spell-categories';
import { withAudit } from '@/db/repository';
import { FIXTURE_USERS } from '@/db/seed/standard';

// The two category join tables, one template: a pair keyed on itself, four
// stamps and no tombstone, hard-deleted (MB.34; claude-docs/db/hard-delete-join-tables.md,
// "Hard delete on two join tables"). Foreign keys, NOT NULL and index names
// are the drift test's; the stamps are the audit-columns sweep's.

const AUTHOR = FIXTURE_USERS.A.id;
const SECOND_AUTHOR = FIXTURE_USERS.B.id;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

// Invented names (M1.25), numbered so two owners never share a slug or an identity.
const JOINS = [
  {
    name: 'ingredient_categories',
    table: ingredientCategories,
    owner: 'ingredient_id',
    key: 'ingredientId',
    insertOwner: (n: number) =>
      insertIngredient(
        sql,
        makeIngredient({ name: `Testwort ${n}`, canonicalName: `Fixtura testalis ${n}` }),
        AUTHOR,
      ),
  },
  {
    name: 'spell_categories',
    table: spellCategories,
    owner: 'spell_id',
    key: 'spellId',
    insertOwner: (n: number) => insertSpell(sql, makeSpell({ title: `Fixture Rite ${n}` }), AUTHOR),
  },
] as const;

// Read back in `beforeAll`: the seed generates the category ids.
let FIRST: string;
let SECOND: string;

beforeAll(async () => {
  const rows = await sql`
    select id from categories where deleted_at is null order by slug limit 2
  `;
  [FIRST, SECOND] = rows.map((row) => row.id as string);
});

describe.each(JOINS)('$name', ({ name, table, owner, key, insertOwner }) => {
  const { byName, indexes, primaryKeys } = tableFacts(table);
  let ownerCount = 0;
  const newOwner = () => insertOwner(++ownerCount);

  async function assign(ownerId: string, categoryId: string, author = AUTHOR): Promise<void> {
    await sql`
      insert into ${sql(name)} ${sql({
        [owner]: ownerId,
        category_id: categoryId,
        created_by: author,
        updated_by: author,
      })}
    `;
  }

  async function categoriesOf(ownerId: string): Promise<string[]> {
    const rows = await sql`
      select category_id from ${sql(name)} where ${sql(owner)} = ${ownerId} order by category_id
    `;
    return rows.map((row) => row.category_id as string);
  }

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([owner, 'category_id', ...STAMP_COLUMNS].sort());
  });

  // A surrogate id would let the same pair be assigned twice.
  it('keys on the pair, with no surrogate id', () => {
    expect(byName.id).toBeUndefined();
    expect(primaryKeys.map((pk) => pk.columns.map((column) => column.name))).toEqual([
      [owner, 'category_id'],
    ]);
  });

  // The key answers "what is this tagged with"; a category filter needs its
  // own index, `category_id` leading, or it scans every assignment.
  it('indexes the reverse direction, category first', () => {
    const reverse = indexes.find((index) => index.config.name === `${name}_category_id_idx`);

    expect(reverse?.config.unique).toBe(false);
    expect(reverse?.config.columns.map((column) => (column as { name: string }).name)).toEqual([
      'category_id',
      owner,
    ]);
  });

  // Stories 22 and 48, and the precondition for the refusal below: several
  // pairs insert, so the key on the pair is what stops the duplicate.
  it('lets one row carry several categories, and a category several rows', async () => {
    const first = await newOwner();
    const second = await newOwner();

    await assign(first, FIRST);
    await assign(first, SECOND);
    await assign(second, FIRST);

    expect(await categoriesOf(first)).toEqual([FIRST, SECOND].sort());
    expect(await categoriesOf(second)).toEqual([FIRST]);
  });

  // The pair is the identity: a second member toggling the same chip is the same row.
  it('refuses the same pair twice, whoever adds it', async () => {
    const ownerId = await newOwner();
    await assign(ownerId, FIRST);

    const error = await failureOf(assign(ownerId, FIRST, SECOND_AUTHOR));

    // 23505 is unique_violation, named: the primary key refused, not something earlier.
    expect(error.code).toBe('23505');
    expect(error.constraint_name).toBe(`${name}_${owner}_category_id_pk`);
  });

  // `write.delete` against the real table rather than the repository tests' scratch pair.
  it('is deleted outright through write.delete, and re-added as an ordinary insert', async () => {
    const ownerId = await newOwner();
    const pair = { [key]: ownerId, categoryId: FIRST };
    const add = (author: string) =>
      withAudit({ userId: author }, (write) => write.insert(table, pair as never));

    await add(AUTHOR);
    const removed = await withAudit({ userId: AUTHOR }, (write) =>
      write.delete(table, pair as never),
    );

    expect(removed).toHaveLength(1);
    expect(await categoriesOf(ownerId)).toEqual([]);

    const [readded] = (await add(SECOND_AUTHOR)) as { createdBy: string }[];

    expect(await categoriesOf(ownerId)).toEqual([FIRST]);
    // The stamps are the second member's, not the first author's resurrected.
    expect(readded.createdBy).toBe(SECOND_AUTHOR);
  });
});

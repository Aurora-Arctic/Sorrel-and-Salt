import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertSpell } from '../../../support/db/insert-spell';
import { STAMP_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { makeIngredient, makeSpell, makeVariant } from '../../../support/fixtures';
import { ingredientCategories } from '@/modules/ingredients/schema/ingredient-categories';
import { spellCategories } from '@/modules/grimoire/schema/spell-categories';
import { withAudit } from '@/db/repository';
import { FIXTURE_USERS } from '@/db/seed/standard';

// The two category join tables, one template: a pair keyed on itself, four
// stamps and no tombstone, hard-deleted (MB.34; claude-docs/db/hard-delete-join-tables.md,
// "Hard delete on two join tables"). Foreign keys, NOT NULL and index names
// are the drift test's; the stamps are the audit-columns sweep's. An
// ingredient's pair may also name one of its forms (MB.217), the rows below
// the template.

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
    // The parent's pair: a pair naming no form, so the refusal is the parent index's.
    columns: ['ingredient_id', 'variant_id', 'category_id'],
    pairKey: 'ingredient_categories_ingredient_category_unique',
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
    columns: ['spell_id', 'category_id'],
    pairKey: 'spell_categories_spell_id_category_id_pk',
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

describe.each(JOINS)('$name', ({ name, table, owner, key, columns, pairKey, insertOwner }) => {
  const { byName } = tableFacts(table);
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
    expect(Object.keys(byName).sort()).toEqual([...columns, ...STAMP_COLUMNS].sort());
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

    // 23505 is unique_violation, named: the pair's key refused, not something earlier.
    expect(error.code).toBe('23505');
    expect(error.constraint_name).toBe(pairKey);
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

// MB.217: a pair naming a variant files that form, and still carries its
// ingredient, so the compendium's category filter reads the union for free.
describe('ingredient_categories, on a form', () => {
  let ingredientId: string;
  let variantId: string;
  let otherVariant: string;

  async function assign(categoryId: string, variant: string | null): Promise<void> {
    await sql`
      insert into ingredient_categories ${sql({
        ingredient_id: ingredientId,
        variant_id: variant,
        category_id: categoryId,
        created_by: AUTHOR,
        updated_by: AUTHOR,
      })}
    `;
  }

  const pairs = async () =>
    (
      await sql`
        select variant_id, category_id from ingredient_categories
        where ingredient_id = ${ingredientId} order by variant_id nulls first, category_id
      `
    ).map((row) => [row.variant_id, row.category_id]);

  beforeAll(async () => {
    ingredientId = await insertIngredient(
      sql,
      makeIngredient({
        name: 'Testwort Varia',
        canonicalName: 'Fixtura varia',
        variants: [makeVariant({ form: 'Testleaf' })],
      }),
      AUTHOR,
    );
    const other = await insertIngredient(
      sql,
      makeIngredient({
        name: 'Testwort Alia',
        canonicalName: 'Fixtura alia',
        variants: [makeVariant({ form: 'Testleaf' })],
      }),
      AUTHOR,
    );
    const variants = await sql`
      select id, ingredient_id from ingredient_variants where ingredient_id in ${sql([ingredientId, other])}
    `;
    variantId = variants.find((row) => row.ingredient_id === ingredientId)?.id as string;
    otherVariant = variants.find((row) => row.ingredient_id === other)?.id as string;
  });

  beforeEach(async () => {
    await sql`delete from ingredient_categories where ingredient_id = ${ingredientId}`;
  });

  it('holds a category once on the parent and once on a form, never twice on the form', async () => {
    await assign(FIRST, null);
    await assign(FIRST, variantId);

    const error = await failureOf(assign(FIRST, variantId));

    expect(error.code).toBe('23505');
    expect(error.constraint_name).toBe('ingredient_categories_variant_category_unique');
    expect(await pairs()).toEqual([
      [null, FIRST],
      [variantId, FIRST],
    ]);
  });

  // Why it could have been admitted: the variant is live, only another ingredient's.
  it("refuses another ingredient's variant beside its ingredient", async () => {
    const error = await failureOf(assign(FIRST, otherVariant));

    // 23503 is foreign_key_violation, named: the composite key refused.
    expect(error.code).toBe('23503');
    expect(error.constraint_name).toBe('ingredient_categories_variant_fk');
  });

  it("removes only the parent's pair through write.delete with variantId null", async () => {
    await assign(FIRST, null);
    await assign(FIRST, variantId);

    const removed = await withAudit({ userId: AUTHOR }, (write) =>
      write.delete(ingredientCategories, { ingredientId, variantId: null, categoryId: FIRST }),
    );

    expect(removed).toHaveLength(1);
    expect(await pairs()).toEqual([[variantId, FIRST]]);
  });
});

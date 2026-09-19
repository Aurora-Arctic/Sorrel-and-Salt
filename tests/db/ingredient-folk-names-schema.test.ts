import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { ingredientFolkNames } from '@/db/schema/ingredient-folk-names';
import { ingredients } from '@/db/schema/ingredients';
import { users } from '@/db/schema/users';
import { FIXTURE_USERS } from '@/db/seed/standard';

// The full six, not `ingredient_categories`' four: MB.34 hard-deletes the three
// join tables and this is not one of them. A folk name is content — "Devil's
// Shoestring" is a thing someone wrote down, not a link between two rows — so
// removing one leaves a tombstone, and the tombstone is what makes the partial
// index below necessary.
const AUDIT_COLUMNS = [
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
  'deleted_at',
  'deleted_by',
];

// DESIGN.md §5's two indexes, transcribed by name.
const UNIQUE_INDEX = 'ingredient_folk_names_unique';
const TRIGRAM_INDEX = 'ingredient_folk_names_trgm';
const INGREDIENT_FK = 'ingredient_folk_names_ingredient_id_ingredients_id_fk';

describe('ingredient_folk_names schema', () => {
  const { columns, indexes, foreignKeys } = getTableConfig(ingredientFolkNames);
  const byName = Object.fromEntries(columns.map((column) => [column.name, column]));
  const indexByName = Object.fromEntries(indexes.map((index) => [index.config.name, index]));
  const foreignKeyByColumn = Object.fromEntries(
    foreignKeys.map((fk) => {
      const { columns: local, foreignColumns, foreignTable } = fk.reference();
      return [local[0].name, { foreignColumnName: foreignColumns[0].name, foreignTable }];
    }),
  );

  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['id', 'ingredient_id', 'name', ...AUDIT_COLUMNS].sort(),
    );
  });

  // Unlike `ingredient_categories`, which keys on its pair: the pair is not the
  // identity here, because `(ingredient_id, lower(name))` is unique only among
  // *live* rows and a primary key carries no predicate. A surrogate id is also
  // what M8.3a's promotion swaps against — one row to name, not a pair to
  // reconstruct.
  it('carries a surrogate id as its primary key', () => {
    expect(byName.id.primary).toBe(true);
    expect(byName.id.hasDefault).toBe(true);
  });

  it('requires an ingredient and a name', () => {
    expect(byName.ingredient_id.notNull).toBe(true);
    expect(byName.name.notNull).toBe(true);
  });

  it('points at the ingredient that claims the name', () => {
    expect(foreignKeyByColumn.ingredient_id.foreignTable).toBe(ingredients);
    expect(foreignKeyByColumn.ingredient_id.foreignColumnName).toBe('id');
  });

  it('spreads the six audit columns, the four stamps required', () => {
    for (const column of AUDIT_COLUMNS) {
      expect(byName[column]).toBeDefined();
    }
    for (const column of ['created_at', 'created_by', 'updated_at', 'updated_by']) {
      expect(byName[column].notNull).toBe(true);
    }
    // The tombstone is null on a live row, which is the whole predicate below.
    expect(byName.deleted_at.notNull).toBe(false);
    expect(byName.deleted_by.notNull).toBe(false);
  });

  it('references users.id from every audit id (MB.5)', () => {
    for (const column of ['created_by', 'updated_by', 'deleted_by']) {
      expect(foreignKeyByColumn[column]).toBeDefined();
      expect(foreignKeyByColumn[column].foreignColumnName).toBe('id');
      expect(foreignKeyByColumn[column].foreignTable).toBe(users);
    }
  });

  it('declares exactly the two indexes DESIGN.md §5 names', () => {
    expect(Object.keys(indexByName).sort()).toEqual([UNIQUE_INDEX, TRIGRAM_INDEX].sort());
  });

  // Rule 4: without the predicate a soft-deleted folk name reserves its spelling
  // on that ingredient forever, and nothing at a call site could get it back.
  it('makes the uniqueness index unique and partial', () => {
    expect(indexByName[UNIQUE_INDEX].config.unique).toBe(true);
    expect(indexByName[UNIQUE_INDEX].config.where).toBeDefined();
  });

  // Uniqueness is the other index's job. A unique trigram index is not even
  // buildable, but the non-uniqueness matters for a different reason: two
  // ingredients sharing a common name must both be indexed under it.
  it('makes the trigram index neither unique nor partial', () => {
    expect(indexByName[TRIGRAM_INDEX].config.unique).toBe(false);
    expect(indexByName[TRIGRAM_INDEX].config.where).toBeUndefined();
  });
});

// The behaviour half, against the real table. This worker's sorrel_test_<n>
// clone arrives with every migration applied and the `standard` scenario
// seeded (M1.27, tests/support/db-setup.ts), and re-cloned that way before
// this file runs — so what is asserted below is the SQL production runs, with
// no schema built here and nothing to put back afterwards. Until M1.27 the
// template was empty: this file applied the one migration that ships the
// table and stubbed `users`/`ingredients` to a bare `id` column.
//
// The author and both ingredients are the seed's, not invented ids: the real
// `users` and `ingredients` have NOT NULL names and audit stamps, and a row
// that exists is cheaper to point at than one to construct. Bound to the old
// names so the tests read as they did.
const AUTHOR = FIXTURE_USERS.A.id;
// Uncaria tomentosa, the vine. Displays "Cat's Claw".
let UNCARIA: string;
// Senegalia greggii — the shrub that was Acacia greggii until it was renamed
// out of Acacia — and an unrelated plant. Also displays "Cat's Claw": §5's own
// example, and the reason uniqueness here is per ingredient rather than global.
let ACACIA: string;
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

async function addFolkName(ingredientId: string, name: string): Promise<string> {
  const [inserted] = await sql`
    insert into ingredient_folk_names (ingredient_id, name, created_by, updated_by)
    values (${ingredientId}, ${name}, ${AUTHOR}, ${AUTHOR})
    returning id
  `;
  return inserted.id as string;
}

async function softDelete(id: string): Promise<void> {
  await sql`
    update ingredient_folk_names set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${id}
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

async function liveNames(ingredientId: string): Promise<string[]> {
  const rows = await sql`
    select name from ingredient_folk_names
    where ingredient_id = ${ingredientId} and deleted_at is null
    order by name
  `;
  return rows.map((row) => row.name as string);
}

async function columnNames(table: string): Promise<string[]> {
  const rows = await sql`
    select column_name from information_schema.columns
    where table_name = ${table} order by column_name
  `;
  return rows.map((row) => row.column_name as string);
}

type IndexRow = { unique: boolean; predicate: string | null; definition: string };

async function indexRow(name: string): Promise<IndexRow | undefined> {
  const [found] = await sql`
    select i.indisunique as unique,
           pg_get_expr(i.indpred, i.indrelid) as predicate,
           pg_get_indexdef(i.indexrelid) as definition
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    where i.indrelid = 'ingredient_folk_names'::regclass and c.relname = ${name}
  `;
  return found as IndexRow | undefined;
}

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });

  UNCARIA = await compendiumIdOf('Uncaria tomentosa');
  ACACIA = await compendiumIdOf('Senegalia greggii');
});

// The seed gives both ingredients folk names of their own, and every test
// below assumes an empty table: this table is a leaf, so a truncate reaches
// nothing else — the same starting state the old empty template gave,
// reached the other way round.
beforeEach(async () => {
  await sql`truncate ingredient_folk_names`;
});

afterAll(async () => {
  await sql.end();
});

describe('ingredient_folk_names table', () => {
  it('carries the six audit columns beside the id, the ingredient and the name', async () => {
    expect(await columnNames('ingredient_folk_names')).toEqual(
      ['id', 'ingredient_id', 'name', ...AUDIT_COLUMNS].sort(),
    );
  });

  // Asserting the rendered predicate rather than merely "some predicate exists"
  // is the point: a dropped WHERE widens the reservation to forever, and the
  // re-add test below is the only one that would notice.
  describe('catalogue introspection', () => {
    it('makes the folded name unique per ingredient, among live rows only', async () => {
      const index = await indexRow(UNIQUE_INDEX);

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('(deleted_at IS NULL)');
      // `(ingredient_id, lower(name))`, in that order: the ingredient leads, so
      // the index scopes uniqueness to one ingredient rather than the table, and
      // `lower(name)` is what folds "Cat's Claw" onto "cat's claw".
      expect(index?.definition).toContain('USING btree (ingredient_id, lower(name))');
    });

    it('indexes the name for trigram matching (DESIGN.md §9)', async () => {
      const index = await indexRow(TRIGRAM_INDEX);

      expect(index?.unique).toBe(false);
      expect(index?.predicate).toBeNull();
      expect(index?.definition).toContain('USING gin (name gin_trgm_ops)');
    });

    it('carries no unique index beyond the primary key and that one', async () => {
      const rows = await sql`
        select c.relname as name
        from pg_index i
        join pg_class c on c.oid = i.indexrelid
        where i.indrelid = 'ingredient_folk_names'::regclass and i.indisunique
        order by c.relname
      `;

      expect(rows.map((row) => row.name as string)).toEqual([
        'ingredient_folk_names_pkey',
        UNIQUE_INDEX,
      ]);
    });
  });

  describe('uniqueness is per ingredient', () => {
    it('refuses the same folk name twice on one ingredient', async () => {
      await addFolkName(UNCARIA, "Cat's Claw");

      const error = await failureOf(addFolkName(UNCARIA, "Cat's Claw"));

      // 23505 is unique_violation, named: proof the insert reached this index
      // rather than failing some other constraint first.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(UNIQUE_INDEX);
    });

    it('folds case, so Cat’s Claw and cat’s claw are one name', async () => {
      await addFolkName(UNCARIA, "Cat's Claw");

      const error = await failureOf(addFolkName(UNCARIA, "cat's claw"));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(UNIQUE_INDEX);
    });

    // §5's documented case, and deliberately not an error: Uncaria tomentosa and
    // Acacia greggii are unrelated plants that both answer to "Cat's Claw".
    it('lets two unrelated ingredients both claim one common name', async () => {
      await addFolkName(UNCARIA, "Cat's Claw");

      await addFolkName(ACACIA, "Cat's Claw");

      expect(await liveNames(UNCARIA)).toEqual(["Cat's Claw"]);
      expect(await liveNames(ACACIA)).toEqual(["Cat's Claw"]);
      // Why it could have failed: the same spelling on one ingredient *is*
      // refused, so what admitted the second row is the ingredient scoping and
      // not a missing index. Drop `ingredient_id` from the index and this line
      // is what reddens.
      const error = await failureOf(addFolkName(ACACIA, "cat's claw"));
      expect(error.constraint_name).toBe(UNIQUE_INDEX);
    });

    it('lets one ingredient hold several folk names', async () => {
      await addFolkName(UNCARIA, "Cat's Claw");
      await addFolkName(UNCARIA, 'Uña de Gato');

      expect(await liveNames(UNCARIA)).toEqual(["Cat's Claw", 'Uña de Gato']);
    });
  });

  // Rule 4's reason for the partial predicate, exercised end to end: a folk name
  // removed by mistake must be re-addable, and under a plain unique index the
  // tombstone would hold its spelling forever.
  describe('re-adding a removed folk name', () => {
    it('succeeds after a soft delete', async () => {
      const id = await addFolkName(UNCARIA, "Cat's Claw");
      await softDelete(id);

      const readded = await addFolkName(UNCARIA, "Cat's Claw");

      expect(readded).not.toBe(id);
      expect(await liveNames(UNCARIA)).toEqual(["Cat's Claw"]);
    });

    it('leaves the tombstone in place rather than resurrecting it', async () => {
      const id = await addFolkName(UNCARIA, "Cat's Claw");
      await softDelete(id);
      await addFolkName(UNCARIA, "Cat's Claw");

      const rows = await sql`
        select id from ingredient_folk_names
        where ingredient_id = ${UNCARIA} and deleted_at is not null
      `;

      expect(rows.map((row) => row.id as string)).toEqual([id]);
    });
  });

  describe('a folk name belongs to a real ingredient', () => {
    it('refuses an ingredient id no ingredient holds', async () => {
      const error = await failureOf(addFolkName(ABSENT, "Cat's Claw"));

      // 23503 is foreign_key_violation.
      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(INGREDIENT_FK);
    });

    it('refuses an insert naming no ingredient', async () => {
      const error = await failureOf(sql`
        insert into ingredient_folk_names (name, created_by, updated_by)
        values ('Cat''s Claw', ${AUTHOR}, ${AUTHOR})
      `);

      // 23502 is not_null_violation on that exact column.
      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('ingredient_id');
    });

    it('refuses an insert carrying no name', async () => {
      const error = await failureOf(sql`
        insert into ingredient_folk_names (ingredient_id, created_by, updated_by)
        values (${UNCARIA}, ${AUTHOR}, ${AUTHOR})
      `);

      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('name');
    });
  });
});

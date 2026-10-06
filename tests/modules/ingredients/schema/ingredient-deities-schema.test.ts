import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { statementsOfMigrationContaining } from '../../../support/db/migrations';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { ingredientDeities } from '@/modules/ingredients/schema/ingredient-deities';
import { ingredients } from '@/modules/ingredients/schema/ingredients';
import { deities } from '@/modules/vocabulary/schema/deities';
import { FIXTURE_USERS } from '@/db/seed/standard';
import type { DeityEntry, DeityRow } from './types';

// DESIGN.md §5's `ingredient_deities` (MB.165): one row per deity an
// ingredient names, in the order entered, each a name and, when the member
// picked a curated deity, a link to it. The table task: nothing reads or
// writes it until MB.167 but MB.166's fill, re-run at the end of this file.
const OWN_COLUMNS = ['id', 'ingredient_id', 'deity_id', 'name', 'position'];

const POSITION_INDEX = 'ingredient_deities_position_unique';
const LINK_INDEX = 'ingredient_deities_link_unique';
const NAME_INDEX = 'ingredient_deities_name_unique';
const INDEXES = [POSITION_INDEX, LINK_INDEX, NAME_INDEX].sort();
const INGREDIENT_FK = 'ingredient_deities_ingredient_id_ingredients_id_fk';
const DEITY_FK = 'ingredient_deities_deity_id_deities_id_fk';

const CHECK_NAME_NOT_BLANK = 'ingredient_deities_name_not_blank';

// What marks the fill among the shipped migrations: it re-runs here.
const FILL_MIGRATION = 'INSERT INTO "ingredient_deities"';

describe('ingredient_deities schema', () => {
  const {
    byName,
    byIndexName: indexByName,
    checks,
    primaryKeys,
    foreignKeyByColumn,
  } = tableFacts(ingredientDeities);

  // The full six, as substitutes carry: a deity on an ingredient is content,
  // so removing one leaves a tombstone.
  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  it('keys on a surrogate id, so a removed deity reserves nothing', () => {
    expect(byName.id.primary).toBe(true);
    expect(byName.id.hasDefault).toBe(true);
    expect(primaryKeys).toEqual([]);
  });

  // The name is held on a linked row too, so a link whose deity is
  // soft-deleted still reads as its name.
  it('requires the ingredient, the name and the position, and makes the link optional', () => {
    expect(byName.ingredient_id.notNull).toBe(true);
    expect(byName.name.notNull).toBe(true);
    expect(byName.name.getSQLType()).toBe('text');
    expect(byName.position.notNull).toBe(true);
    expect(byName.position.hasDefault).toBe(false);
    expect(byName.deity_id.notNull).toBe(false);
  });

  it('points the ingredient at ingredients and the link at deities', () => {
    expect(foreignKeyByColumn.ingredient_id.foreignTable).toBe(ingredients);
    expect(foreignKeyByColumn.ingredient_id.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.deity_id.foreignTable).toBe(deities);
    expect(foreignKeyByColumn.deity_id.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.name).toBeUndefined();
  });

  it('declares exactly the three unique indexes DESIGN.md §5 names', () => {
    expect(Object.keys(indexByName).sort()).toEqual(INDEXES);
    for (const name of INDEXES) {
      expect(indexByName[name].config.unique).toBe(true);
    }
  });

  it('declares the one check', () => {
    expect(checks.map((check) => check.name)).toEqual([CHECK_NAME_NOT_BLANK]);
  });
});

const AUTHOR = FIXTURE_USERS.A.id;
const EDITOR = FIXTURE_USERS.B.id;
const ABSENT = '99999999-9999-9999-9999-999999999999';

let MUGWORT: string;
let UNCARIA: string;
// One invented god under two invented traditions: the Greek and Roman Hecate
// case, without colliding with a row MB.129 seeds.
let TESTRA_FIXTURAL: string;
let TESTRA_MOCKISH: string;

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));

async function compendiumIdOf(canonicalName: string): Promise<string> {
  const [found] = await sql`
    select id from ingredients
    where workspace_id is null and canonical_name = ${canonicalName} and deleted_at is null
  `;
  if (!found) throw new Error(`The standard seed carries no compendium row for ${canonicalName}`);
  return found.id as string;
}

async function insertDeity(tradition: string): Promise<string> {
  const [{ id: traditionId }] = await sql`
    insert into deity_traditions ${sql({
      name: tradition,
      slug: tradition.toLowerCase(),
      description: 'A tradition kept only by fixtures.',
      created_by: AUTHOR,
      updated_by: AUTHOR,
    })}
    returning id
  `;
  const [{ id }] = await sql`
    insert into deities ${sql({
      name: 'Testra',
      slug: `testra-${tradition.toLowerCase()}`,
      description: 'Goddess of the test run, honoured before every assertion.',
      tradition_id: traditionId as string,
      created_by: AUTHOR,
      updated_by: AUTHOR,
    })}
    returning id
  `;
  return id as string;
}

async function addDeity(ingredientId: string, entry: DeityEntry): Promise<string> {
  const [inserted] = await sql`
    insert into ingredient_deities ${sql({
      ingredient_id: ingredientId,
      deity_id: entry.deityId ?? null,
      name: entry.name,
      position: entry.position,
      created_by: AUTHOR,
      updated_by: AUTHOR,
    })}
    returning id
  `;
  return inserted.id as string;
}

async function softDelete(table: 'ingredient_deities' | 'deities', id: string): Promise<void> {
  await sql`update ${sql(table)} set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${id}`;
}

beforeAll(async () => {
  MUGWORT = await compendiumIdOf('Artemisia vulgaris');
  UNCARIA = await compendiumIdOf('Uncaria tomentosa');
  TESTRA_FIXTURAL = await insertDeity('Fixtural');
  TESTRA_MOCKISH = await insertDeity('Mockish');
});

beforeEach(async () => {
  await sql`truncate ingredient_deities`;
});

describe('ingredient_deities table', () => {
  describe('catalogue introspection', () => {
    it('carries the six audit columns beside its own five', async () => {
      expect(await catalogue.columnNames('ingredient_deities')).toEqual(
        [...OWN_COLUMNS, ...AUDIT_COLUMNS].sort(),
      );
    });

    // The order rule (MB.165): the list keeps the order entered, so the
    // parent's index is the one that reads it in order, as a jar's layers are.
    it('makes a position unique per ingredient among live rows, leading on the parent', async () => {
      const index = await catalogue.indexRow('ingredient_deities', POSITION_INDEX);

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('(deleted_at IS NULL)');
      expect(index?.definition).toContain('USING btree (ingredient_id, "position")');
    });

    // The rendered predicate, not "some predicate": a dropped half widens the
    // reservation to tombstones, or to the other kind of row.
    it('makes a link unique per ingredient, among live links only', async () => {
      const index = await catalogue.indexRow('ingredient_deities', LINK_INDEX);

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('((deity_id IS NOT NULL) AND (deleted_at IS NULL))');
      expect(index?.definition).toContain('USING btree (ingredient_id, deity_id)');
    });

    it('makes a folded name unique per ingredient, among live unlinked names only', async () => {
      const index = await catalogue.indexRow('ingredient_deities', NAME_INDEX);

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe('((deity_id IS NULL) AND (deleted_at IS NULL))');
      expect(index?.definition).toContain('USING btree (ingredient_id, lower(name))');
    });

    it('carries no unique index beyond the primary key and those three', async () => {
      expect(await catalogue.uniqueIndexNames('ingredient_deities')).toEqual(
        ['ingredient_deities_pkey', ...INDEXES].sort(),
      );
    });

    it('declares the one check and no others', async () => {
      const rows = await sql`
        select conname from pg_constraint
        where conrelid = 'ingredient_deities'::regclass and contype = 'c'
      `;

      expect(rows.map((row) => row.conname)).toEqual([CHECK_NAME_NOT_BLANK]);
    });
  });

  describe('a deity is a name, linked when picked', () => {
    it('takes a name alone', async () => {
      await addDeity(UNCARIA, { name: 'Rhizomera', position: 0 });
    });

    it('takes a name beside its link', async () => {
      await addDeity(UNCARIA, { deityId: TESTRA_FIXTURAL, name: 'Testra', position: 0 });
    });

    // 23514 is check_violation, named: the refusal is this CHECK's, where
    // NOT NULL alone would accept ''.
    it('refuses a blank name, linked or not', async () => {
      for (const deityId of [null, TESTRA_FIXTURAL]) {
        const error = await failureOf(addDeity(UNCARIA, { deityId, name: '   ', position: 0 }));

        expect(error.code).toBe('23514');
        expect(error.constraint_name).toBe(CHECK_NAME_NOT_BLANK);
      }
    });

    it('refuses a link to an id no deity holds', async () => {
      const error = await failureOf(
        addDeity(UNCARIA, { deityId: ABSENT, name: 'Testra', position: 0 }),
      );

      // 23503 is foreign_key_violation.
      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(DEITY_FK);
    });

    it('refuses a parent id no ingredient holds', async () => {
      const error = await failureOf(addDeity(ABSENT, { name: 'Rhizomera', position: 0 }));

      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(INGREDIENT_FK);
    });

    // A link reads as its name once its deity is soft-deleted (MB.165): the
    // key still holds, and the name is the row's own.
    it('keeps a link, and its name, when the deity is soft-deleted', async () => {
      const kept = await addDeity(UNCARIA, {
        deityId: TESTRA_MOCKISH,
        name: 'Testra',
        position: 0,
      });
      await softDelete('deities', TESTRA_MOCKISH);

      const [row] = await sql`select deity_id, name from ingredient_deities where id = ${kept}`;
      expect(row).toEqual({ deity_id: TESTRA_MOCKISH, name: 'Testra' });
      await sql`update deities set deleted_at = null, deleted_by = null where id = ${TESTRA_MOCKISH}`;
    });
  });

  describe('the list keeps the order entered', () => {
    it('refuses a second live row at one position', async () => {
      await addDeity(UNCARIA, { name: 'Rhizomera', position: 0 });

      const error = await failureOf(addDeity(UNCARIA, { name: 'Bulbon', position: 0 }));

      // 23505 is unique_violation, named: this index refused, not something earlier.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(POSITION_INDEX);
    });

    // Why the refusal above is per ingredient, and about the live list only.
    it('lets two ingredients use one position, and a tombstone free its own', async () => {
      await addDeity(MUGWORT, { name: 'Rhizomera', position: 0 });
      const removed = await addDeity(UNCARIA, { name: 'Rhizomera', position: 0 });
      await softDelete('ingredient_deities', removed);

      await addDeity(UNCARIA, { name: 'Bulbon', position: 0 });
    });
  });

  // DESIGN.md §5: no repeats. MB.167's shared schema refuses a repeat first,
  // so these indexes are the floor beneath it.
  describe('an ingredient names a deity once', () => {
    it('refuses a second live link to the same deity', async () => {
      await addDeity(UNCARIA, { deityId: TESTRA_FIXTURAL, name: 'Testra', position: 0 });

      const error = await failureOf(
        addDeity(UNCARIA, { deityId: TESTRA_FIXTURAL, name: 'Testra', position: 1 }),
      );

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(LINK_INDEX);
    });

    it('refuses a second live unlinked name folding alike', async () => {
      await addDeity(UNCARIA, { name: 'Rhizomera', position: 0 });

      const error = await failureOf(addDeity(UNCARIA, { name: 'RHIZOMERA', position: 1 }));

      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(NAME_INDEX);
    });

    // The point of the link: two same-named curated rows stay told apart.
    it('takes links to two same-named deities on one ingredient', async () => {
      await addDeity(UNCARIA, { deityId: TESTRA_FIXTURAL, name: 'Testra', position: 0 });
      await addDeity(UNCARIA, { deityId: TESTRA_MOCKISH, name: 'Testra', position: 1 });

      const rows = await sql`
        select deity_id from ingredient_deities where ingredient_id = ${UNCARIA} order by position
      `;
      expect(rows.map((row) => row.deity_id)).toEqual([TESTRA_FIXTURAL, TESTRA_MOCKISH]);
    });

    // One is text and the other a link.
    it('does not count a typed name equal to a linked deity’s as a repeat', async () => {
      await addDeity(UNCARIA, { deityId: TESTRA_FIXTURAL, name: 'Testra', position: 0 });

      await addDeity(UNCARIA, { name: 'testra', position: 1 });
    });

    it('lets two ingredients link the same deity, and type the same name', async () => {
      await addDeity(UNCARIA, { deityId: TESTRA_FIXTURAL, name: 'Testra', position: 0 });
      await addDeity(MUGWORT, { deityId: TESTRA_FIXTURAL, name: 'Testra', position: 0 });
      await addDeity(UNCARIA, { name: 'Rhizomera', position: 1 });
      await addDeity(MUGWORT, { name: 'Rhizomera', position: 1 });

      const [{ count }] = await sql`select count(*)::int as count from ingredient_deities`;
      expect(count).toBe(4);
    });

    // Rule 4: a tombstone reserves nothing, so a removed entry can be re-added.
    it('lets a soft-deleted link be linked again', async () => {
      const removed = await addDeity(UNCARIA, {
        deityId: TESTRA_FIXTURAL,
        name: 'Testra',
        position: 0,
      });
      await softDelete('ingredient_deities', removed);

      const readded = await addDeity(UNCARIA, {
        deityId: TESTRA_FIXTURAL,
        name: 'Testra',
        position: 1,
      });

      expect(readded).not.toBe(removed);
    });

    it('lets a soft-deleted name be typed again', async () => {
      const removed = await addDeity(UNCARIA, { name: 'Rhizomera', position: 0 });
      await softDelete('ingredient_deities', removed);

      const readded = await addDeity(UNCARIA, { name: 'rhizomera', position: 1 });

      expect(readded).not.toBe(removed);
    });
  });
});

// The template is migrated before it is seeded, so the migration's fill is
// re-run here, read off disk, against lists shaped as a deployed database
// holds them. `ingredients.deities` is still declared until MB.168.
async function runFill(): Promise<void> {
  const fill = statementsOfMigrationContaining(FILL_MIGRATION).filter((statement) =>
    /^insert\b/i.test(statement),
  );
  expect(fill).toHaveLength(1);
  await sql.unsafe(fill[0]);
}

async function listOn(id: string, list: (string | null)[] | null, editor = AUTHOR) {
  await sql`update ingredients set deities = ${list}, updated_by = ${editor} where id = ${id}`;
}

async function everyDeity(): Promise<DeityRow[]> {
  return sql<DeityRow[]>`
    select ingredient_id, deity_id, name, position, created_by, updated_by, deleted_at
    from ingredient_deities
    order by ingredient_id, position
  `;
}

const nameRow = (ingredientId: string, name: string, position: number, by = AUTHOR): DeityRow => ({
  ingredient_id: ingredientId,
  deity_id: null,
  name,
  position,
  created_by: by,
  updated_by: by,
  deleted_at: null,
});

const byParentAndPosition = (rows: DeityRow[]) =>
  [...rows].sort((a, b) =>
    a.ingredient_id === b.ingredient_id
      ? a.position - b.position
      : a.ingredient_id.localeCompare(b.ingredient_id),
  );

describe('the fill from ingredients.deities (MB.166)', () => {
  beforeEach(async () => {
    await sql`update ingredients set deities = null`;
  });

  it('copies every entry across as an unlinked name row, stamped by the list’s last editor', async () => {
    await listOn(UNCARIA, ['Rhizomera', 'Bulbon', 'Rhizomera'], EDITOR);
    await listOn(MUGWORT, ['Rhizomera']);
    // Why the table could already hold them: nothing else wrote to it.
    expect(await everyDeity()).toEqual([]);

    await runFill();

    expect(await everyDeity()).toEqual(
      byParentAndPosition([
        nameRow(UNCARIA, 'Rhizomera', 0, EDITOR),
        nameRow(UNCARIA, 'Bulbon', 1, EDITOR),
        nameRow(MUGWORT, 'Rhizomera', 0),
      ]),
    );
  });

  // MB.165's order rule: the list keeps the order entered, so the fill keeps
  // the array's, and skipping an entry closes the gap it would leave.
  it('keeps the array’s order in dense positions, past a blank entry and a repeat in another case', async () => {
    await listOn(UNCARIA, ['Rhizomera', '  ', 'Bulbon', 'RHIZOMERA', null, ' Mossanthe ']);
    // Why it could have been refused: the folded repeat collides in the index.
    const error = await failureOf(
      sql.begin(async (tx) => {
        for (const [position, name] of ['Rhizomera', 'RHIZOMERA'].entries()) {
          await tx`
            insert into ingredient_deities (ingredient_id, name, position, created_by, updated_by)
            values (${UNCARIA}, ${name}, ${position}, ${AUTHOR}, ${AUTHOR})`;
        }
      }),
    );
    expect(error.constraint_name).toBe(NAME_INDEX);

    await runFill();

    expect(await everyDeity()).toEqual([
      nameRow(UNCARIA, 'Rhizomera', 0),
      nameRow(UNCARIA, 'Bulbon', 1),
      nameRow(UNCARIA, 'Mossanthe', 2),
    ]);
  });

  // Typed text is never resolved into a link, and the text cannot say which
  // of two same-named deities it meant.
  it('links no row, even one naming a curated deity exactly', async () => {
    await listOn(UNCARIA, ['Testra', 'Rhizomera']);
    // Why it could have been linked: two curated deities carry that name.
    const [{ count: curated }] = await sql`
      select count(*)::int as count from deities where name = 'Testra' and deleted_at is null
    `;
    expect(curated).toBe(2);

    await runFill();

    const rows = await everyDeity();
    expect(rows.map((row) => row.name)).toEqual(['Testra', 'Rhizomera']);
    expect(rows.filter((row) => row.deity_id !== null)).toEqual([]);
  });

  it('writes nothing for a null or empty list', async () => {
    await listOn(UNCARIA, null);
    await listOn(MUGWORT, []);

    await runFill();

    expect(await everyDeity()).toEqual([]);
  });

  // As 0032 filled substitutes: a deleted row's list is kept for v2's restore.
  it('fills a soft-deleted ingredient’s list too, as live rows', async () => {
    await listOn(UNCARIA, ['Rhizomera']);
    await sql`update ingredients set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${UNCARIA}`;

    await runFill();

    expect(await everyDeity()).toEqual([nameRow(UNCARIA, 'Rhizomera', 0)]);
    await sql`update ingredients set deleted_at = null, deleted_by = null where id = ${UNCARIA}`;
  });

  // Still declared and written until MB.167 switches to the table.
  it('leaves the list itself as it was', async () => {
    await listOn(UNCARIA, ['Rhizomera', 'rhizomera', '  ']);

    await runFill();

    const [row] = await sql`select deities from ingredients where id = ${UNCARIA}`;
    expect(row.deities).toEqual(['Rhizomera', 'rhizomera', '  ']);
  });
});

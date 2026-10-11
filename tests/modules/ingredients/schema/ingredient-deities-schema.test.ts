import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { ingredientDeities } from '@/modules/ingredients/schema/ingredient-deities';
import { ingredients } from '@/modules/ingredients/schema/ingredients';
import { deities } from '@/modules/vocabulary/schema/deities';
import { FIXTURE_USERS } from '@/db/seed/standard';
import type { DeityEntry } from './types';

// DESIGN.md §5's `ingredient_deities` (MB.165): one row per deity an
// ingredient names, in the order entered, each a name and, when the member
// picked a curated deity, a link to it.
const OWN_COLUMNS = ['id', 'ingredient_id', 'deity_id', 'name', 'position'];

const CHECK_NAME_NOT_BLANK = 'ingredient_deities_name_not_blank';
const LINK_INDEX = 'ingredient_deities_link_unique';
const NAME_INDEX = 'ingredient_deities_name_unique';

describe('ingredient_deities schema', () => {
  const { byName, nonAuditForeignKeys } = tableFacts(ingredientDeities);

  // The full six, as substitutes carry: a deity on an ingredient is content,
  // so removing one leaves a tombstone.
  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  // §5: a deity's name is free text over the vocabulary, an FK on it would make
  // an uncurated value unwritable; the pick is linked beside the name, and no
  // key reaches a tradition (claude-docs/db/deity-vocabulary.md).
  it('keys the parent and the pick, and never the name', () => {
    expect(nonAuditForeignKeys.map((fk) => [fk.column, fk.foreignTable]).sort()).toEqual([
      ['deity_id', deities],
      ['ingredient_id', ingredients],
    ]);
  });
});

const AUTHOR = FIXTURE_USERS.A.id;

let MUGWORT: string;
let UNCARIA: string;
// One invented god under two invented traditions: the Greek and Roman Hecate
// case, without colliding with a row MB.129 seeds.
let TESTRA_FIXTURAL: string;
let TESTRA_MOCKISH: string;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

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
  describe('a deity is a name, linked when picked', () => {
    it('takes a name alone, or beside its link', async () => {
      await addDeity(UNCARIA, { name: 'Rhizomera', position: 0 });
      await addDeity(UNCARIA, { deityId: TESTRA_FIXTURAL, name: 'Testra', position: 1 });

      const rows = await sql`
        select deity_id, name from ingredient_deities where ingredient_id = ${UNCARIA} order by position
      `;
      expect(rows).toEqual([
        { deity_id: null, name: 'Rhizomera' },
        { deity_id: TESTRA_FIXTURAL, name: 'Testra' },
      ]);
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
  });
});

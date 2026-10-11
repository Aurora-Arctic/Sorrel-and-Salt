import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { referenceLinks } from '@/modules/ingredients/schema/reference-links';
import { FIXTURE_USERS } from '@/db/seed/standard';
import type { LinkFields } from './types';

// DESIGN.md §5's `reference_links` (MB.151): one row per reference a sourced
// row cites, naming exactly one row, with the locator the citation leaves
// out.

// Each sourced column and the table it keys into.
const SOURCED: [column: string, table: string][] = [
  ['ingredient_id', 'ingredients'],
  ['deity_id', 'deities'],
  ['deity_tradition_id', 'deity_traditions'],
  ['planet_id', 'planets'],
  ['zodiac_sign_id', 'zodiac_signs'],
];
const COLUMNS = SOURCED.map(([column]) => column);

const OWN_COLUMNS = ['id', 'reference_id', ...COLUMNS, 'locator'];

const CHECK_ONE_ROW = 'reference_links_one_row';
const CHECK_LOCATOR_NOT_BLANK = 'reference_links_locator_not_blank';
const INGREDIENT_INDEX = 'reference_links_ingredient_unique';

describe('reference_links schema', () => {
  const { byName } = tableFacts(referenceLinks);

  // The full six, as substitutes carry: a link is content, and unlinking
  // leaves a tombstone v2's history restores.
  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });
});

const AUTHOR = FIXTURE_USERS.A.id;

// One live row of each sourced table, and a second ingredient, all seeded.
const ROW: Record<string, string> = {};
let OTHER_INGREDIENT: string;
let SIMEK: string;
let SMITH: string;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

async function addReference(title: string): Promise<string> {
  const [inserted] = await sql`
    insert into "references" ${sql({ kind: 'book', title, created_by: AUTHOR, updated_by: AUTHOR })}
    returning id
  `;
  return inserted.id as string;
}

async function addLink(referenceId: string | null, fields: LinkFields): Promise<string> {
  const [inserted] = await sql`
    insert into reference_links ${sql({
      reference_id: referenceId,
      ...fields,
      created_by: AUTHOR,
      updated_by: AUTHOR,
    })}
    returning id
  `;
  return inserted.id as string;
}

beforeAll(async () => {
  for (const [column, table] of SOURCED) {
    const [found] = await sql`
      select id from ${sql(table)} where deleted_at is null order by id limit 1
    `;
    if (!found) throw new Error(`The standard seed carries no live ${table} row`);
    ROW[column] = found.id as string;
  }
  const [other] = await sql`
    select id from ingredients where deleted_at is null and id <> ${ROW.ingredient_id}
    order by id limit 1
  `;
  OTHER_INGREDIENT = other.id as string;
});

beforeEach(async () => {
  await sql`truncate reference_links, "references"`;
  SIMEK = await addReference('Dictionary of Northern Fixtures');
  SMITH = await addReference('A Dictionary of Invented Biography');
});

describe('reference_links table', () => {
  describe('a link names exactly one row', () => {
    // A locator, or none: the part of the source the citation leaves out.
    it('takes a link to one row, with a locator or without', async () => {
      await addLink(SIMEK, { ingredient_id: ROW.ingredient_id, locator: 's.v. Testwort' });
      await addLink(SMITH, { ingredient_id: ROW.ingredient_id });

      const rows = await sql`
        select reference_id, locator from reference_links
        where ingredient_id = ${ROW.ingredient_id} order by locator nulls last
      `;
      expect(rows).toEqual([
        { reference_id: SIMEK, locator: 's.v. Testwort' },
        { reference_id: SMITH, locator: null },
      ]);
    });

    // 23514 is check_violation, named.
    it('refuses a link naming two rows', async () => {
      const error = await failureOf(
        addLink(SIMEK, { ingredient_id: ROW.ingredient_id, deity_id: ROW.deity_id }),
      );

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_ONE_ROW);
    });

    it('refuses a link naming none', async () => {
      const error = await failureOf(addLink(SIMEK, { locator: 'p. 112' }));

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_ONE_ROW);
    });
  });

  describe('the locator', () => {
    it('refuses a blank locator', async () => {
      const error = await failureOf(
        addLink(SIMEK, { ingredient_id: ROW.ingredient_id, locator: '   ' }),
      );

      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe(CHECK_LOCATOR_NOT_BLANK);
    });
  });

  // One link per reference per row (MB.151). MB.153's service refuses a
  // repeat first, so these indexes are the floor beneath it.
  describe('a row cites a reference once', () => {
    it('refuses a second live link of one reference to it, whatever its locator', async () => {
      await addLink(SIMEK, { ingredient_id: ROW.ingredient_id, locator: 'p. 112' });

      const error = await failureOf(
        addLink(SIMEK, { ingredient_id: ROW.ingredient_id, locator: 'p. 40' }),
      );

      // 23505 is unique_violation, named: this column's index refused.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(INGREDIENT_INDEX);
    });

    // Why the refusal above is per reference: a row cites many.
    it('takes a second reference to the same row', async () => {
      await addLink(SIMEK, { ingredient_id: ROW.ingredient_id });
      await addLink(SMITH, { ingredient_id: ROW.ingredient_id });

      const [{ count }] = await sql`
        select count(*)::int as count from reference_links where ingredient_id = ${ROW.ingredient_id}
      `;
      expect(count).toBe(2);
    });
  });

  it('lets one reference support many rows, of one table and of several', async () => {
    await addLink(SIMEK, { ingredient_id: ROW.ingredient_id });
    await addLink(SIMEK, { ingredient_id: OTHER_INGREDIENT });
    for (const column of COLUMNS.filter((name) => name !== 'ingredient_id')) {
      await addLink(SIMEK, { [column]: ROW[column] });
    }

    const [{ count }] = await sql`
      select count(*)::int as count from reference_links where reference_id = ${SIMEK}
    `;
    expect(count).toBe(COLUMNS.length + 1);
  });
});

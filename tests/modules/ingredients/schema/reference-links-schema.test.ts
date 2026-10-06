import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import type { PgTable } from 'drizzle-orm/pg-core';
import { failureOf, useTestDatabase } from '../../../support/db/database';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { referenceLinks } from '@/modules/ingredients/schema/reference-links';
import { references } from '@/modules/ingredients/schema/references';
import { ingredients } from '@/modules/ingredients/schema/ingredients';
import { deities, deityTraditions } from '@/modules/vocabulary/schema/deities';
import { planets, zodiacSigns } from '@/modules/vocabulary/schema/astrology';
import { FIXTURE_USERS } from '@/db/seed/standard';
import type { LinkFields } from './types';

// DESIGN.md §5's `reference_links` (MB.151): one row per reference a sourced
// row cites, naming exactly one row, with the locator the citation leaves
// out. The table task, MB.152: nothing reads or writes it until MB.153.

// Each sourced column, the table it keys into, and the index that keeps one
// live link per reference per row.
const SOURCED: [column: string, table: string, target: PgTable][] = [
  ['ingredient_id', 'ingredients', ingredients],
  ['deity_id', 'deities', deities],
  ['deity_tradition_id', 'deity_traditions', deityTraditions],
  ['planet_id', 'planets', planets],
  ['zodiac_sign_id', 'zodiac_signs', zodiacSigns],
];
const COLUMNS = SOURCED.map(([column]) => column);
const indexOf = (column: string) => `reference_links_${column.replace(/_id$/, '')}_unique`;
const INDEXES = COLUMNS.map(indexOf).sort();

const OWN_COLUMNS = ['id', 'reference_id', ...COLUMNS, 'locator'];

const CHECK_ONE_ROW = 'reference_links_one_row';
const CHECK_LOCATOR_NOT_BLANK = 'reference_links_locator_not_blank';
const CHECKS = [CHECK_LOCATOR_NOT_BLANK, CHECK_ONE_ROW].sort();
const REFERENCE_FK = 'reference_links_reference_id_references_id_fk';

describe('reference_links schema', () => {
  const {
    byName,
    byIndexName: indexByName,
    checks,
    primaryKeys,
    foreignKeyByColumn,
    nonAuditForeignKeys,
  } = tableFacts(referenceLinks);

  // The full six, as substitutes carry: a link is content, and unlinking
  // leaves a tombstone v2's history restores.
  it('has DESIGN.md §5 columns and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual([...OWN_COLUMNS, ...AUDIT_COLUMNS].sort());
  });

  it('keys on a surrogate id, so an unlinked reference reserves nothing', () => {
    expect(byName.id.primary).toBe(true);
    expect(byName.id.hasDefault).toBe(true);
    expect(primaryKeys).toEqual([]);
  });

  it('requires the reference, and makes every sourced row and the locator optional', () => {
    expect(byName.reference_id.notNull).toBe(true);
    for (const column of [...COLUMNS, 'locator']) {
      expect(byName[column].notNull, column).toBe(false);
    }
    expect(byName.locator.getSQLType()).toBe('text');
  });

  it('points the reference at references and each sourced column at its table', () => {
    expect(foreignKeyByColumn.reference_id.foreignTable).toBe(references);
    for (const [column, , target] of SOURCED) {
      expect(foreignKeyByColumn[column].foreignTable, column).toBe(target);
      expect(foreignKeyByColumn[column].foreignColumnName).toBe('id');
    }
    expect(nonAuditForeignKeys.map((fk) => fk.column).sort()).toEqual(
      ['reference_id', ...COLUMNS].sort(),
    );
  });

  it('declares exactly one unique index per sourced column', () => {
    expect(Object.keys(indexByName).sort()).toEqual(INDEXES);
    for (const name of INDEXES) {
      expect(indexByName[name].config.unique, name).toBe(true);
    }
  });

  it('declares the two checks', () => {
    expect(checks.map((check) => check.name).sort()).toEqual(CHECKS);
  });
});

const AUTHOR = FIXTURE_USERS.A.id;
const ABSENT = '99999999-9999-9999-9999-999999999999';

// One live row of each sourced table, and a second ingredient, all seeded.
const ROW: Record<string, string> = {};
let OTHER_INGREDIENT: string;
let SIMEK: string;
let SMITH: string;

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));

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

async function unlink(id: string): Promise<void> {
  await sql`update reference_links set deleted_at = now(), deleted_by = ${AUTHOR} where id = ${id}`;
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
  describe('catalogue introspection', () => {
    it('carries the six audit columns beside its own', async () => {
      expect(await catalogue.columnNames('reference_links')).toEqual(
        [...OWN_COLUMNS, ...AUDIT_COLUMNS].sort(),
      );
    });

    // The rendered predicate, not "some predicate": a dropped half widens the
    // reservation to tombstones, or to the other columns' links. Leading on
    // the sourced id, each also serves the read of one row's links.
    it.each(COLUMNS)('makes a reference unique per %s, among live links to one', async (column) => {
      const index = await catalogue.indexRow('reference_links', indexOf(column));

      expect(index?.unique).toBe(true);
      expect(index?.predicate).toBe(`((${column} IS NOT NULL) AND (deleted_at IS NULL))`);
      expect(index?.definition).toContain(`USING btree (${column}, reference_id)`);
    });

    // No plain parent index beside them, as `ingredient_deities` builds none.
    it('carries no index beyond the primary key and the five', async () => {
      const rows = await sql`
        select c.relname from pg_index i join pg_class c on c.oid = i.indexrelid
        where i.indrelid = 'reference_links'::regclass
        order by c.relname
      `;

      expect(rows.map((row) => row.relname)).toEqual(['reference_links_pkey', ...INDEXES].sort());
    });

    // Nothing reads from a reference back to its links, and a reference is
    // never hard-deleted (MB.151, decision 5).
    it('leads no index on reference_id', async () => {
      const rows = await sql`
        select c.relname from pg_index i
        join pg_class c on c.oid = i.indexrelid
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
        where i.indrelid = 'reference_links'::regclass and a.attname = 'reference_id'
      `;

      expect(rows).toEqual([]);
    });

    it('declares the two checks and no others', async () => {
      const rows = await sql`
        select conname from pg_constraint
        where conrelid = 'reference_links'::regclass and contype = 'c'
        order by conname
      `;

      expect(rows.map((row) => row.conname)).toEqual(CHECKS);
    });
  });

  describe('a link names exactly one row', () => {
    it.each(COLUMNS)('takes a link to one %s row', async (column) => {
      await addLink(SIMEK, { [column]: ROW[column] });
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

    it('refuses a link with no reference', async () => {
      const error = await failureOf(addLink(null, { ingredient_id: ROW.ingredient_id }));

      // 23502 is not_null_violation.
      expect(error.code).toBe('23502');
      expect(error.column_name).toBe('reference_id');
    });

    it('refuses a reference id no reference holds', async () => {
      const error = await failureOf(addLink(ABSENT, { ingredient_id: ROW.ingredient_id }));

      // 23503 is foreign_key_violation.
      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(REFERENCE_FK);
    });

    it.each(SOURCED)('refuses a %s no %s row holds', async (column, table) => {
      const error = await failureOf(addLink(SIMEK, { [column]: ABSENT }));

      expect(error.code).toBe('23503');
      expect(error.constraint_name).toBe(`reference_links_${column}_${table}_id_fk`);
    });
  });

  describe('a link carries a locator and nothing else', () => {
    it('takes a link with a locator, and one without', async () => {
      await addLink(SIMEK, { ingredient_id: ROW.ingredient_id, locator: 's.v. Testwort' });
      await addLink(SMITH, { ingredient_id: ROW.ingredient_id });
    });

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
  describe.each(COLUMNS)('a %s row cites a reference once', (column) => {
    it('refuses a second live link of one reference to it, whatever its locator', async () => {
      await addLink(SIMEK, { [column]: ROW[column], locator: 'p. 112' });

      const error = await failureOf(addLink(SIMEK, { [column]: ROW[column], locator: 'p. 40' }));

      // 23505 is unique_violation, named: this column's index refused.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(indexOf(column));
    });

    // Why the refusal above is per reference: a row cites many.
    it('takes a second reference to the same row', async () => {
      await addLink(SIMEK, { [column]: ROW[column] });
      await addLink(SMITH, { [column]: ROW[column] });
    });

    // Rule 4: a tombstone reserves nothing, so an unlinked source can be relinked.
    it('lets a soft-deleted link be linked again', async () => {
      const removed = await addLink(SIMEK, { [column]: ROW[column] });
      await unlink(removed);

      const relinked = await addLink(SIMEK, { [column]: ROW[column] });

      expect(relinked).not.toBe(removed);
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

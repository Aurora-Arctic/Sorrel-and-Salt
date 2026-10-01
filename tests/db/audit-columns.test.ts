import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import type { PgTable } from 'drizzle-orm/pg-core';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { useTestDatabase } from '../support/db/database';
import {
  AUDITED_TABLES,
  AUDIT_COLUMNS,
  DELETE_COLUMNS,
  STAMP_COLUMNS,
  UNAUDITED_TABLES,
  tableFacts,
} from '../support/db/table-metadata';
import { users } from '@/modules/identity/schema/users';
import { categories, categoryGroups } from '@/modules/vocabulary/schema/categories';
import { ingredientCategories } from '@/modules/ingredients/schema/ingredient-categories';
import { ingredientFolkNames } from '@/modules/ingredients/schema/ingredient-folk-names';
import {
  ingredientFormGroups,
  ingredientForms,
} from '@/modules/vocabulary/schema/ingredient-forms';
import { ingredients } from '@/modules/ingredients/schema/ingredients';
import { inventoryItems } from '@/modules/ingredients/schema/inventory-items';
import { retiredIngredientSlugs } from '@/modules/ingredients/schema/retired-ingredient-slugs';
import { planets, zodiacSigns } from '@/modules/vocabulary/schema/astrology';
import { spellCategories } from '@/modules/grimoire/schema/spell-categories';
import { spellIngredients } from '@/modules/grimoire/schema/spell-ingredients';
import { spells } from '@/modules/grimoire/schema/spells';
import { workspaceInvitations } from '@/modules/coven/schema/workspace-invitations';
import { workspaceMembers, workspaces } from '@/modules/coven/schema/workspaces';
import type { Reference } from './types';

// One sweep rather than a copy in every schema test: a table added without
// `...auditColumns` fails here, where a per-file copy would simply not exist.
// Both halves are asserted because they can disagree — a spread removed from
// a schema file leaves the migrated database's columns standing
// (claude-docs/testing.md, "The db test harness").

// Table objects, transcribed: an empty list is a failing test, not a vacuous pass.
const AUDITED: PgTable[] = [
  categoryGroups,
  categories,
  ingredientFolkNames,
  ingredientFormGroups,
  ingredientForms,
  ingredients,
  inventoryItems,
  planets,
  retiredIngredientSlugs,
  spellIngredients,
  spells,
  users,
  workspaceInvitations,
  workspaceMembers,
  workspaces,
  zodiacSigns,
];

/** Hard-deleted, so four stamps and no tombstone (MB.34). */
const STAMPED: PgTable[] = [ingredientCategories, spellCategories];

const AUDIT_IDS = ['created_by', 'updated_by', 'deleted_by'];
const STAMP_IDS = ['created_by', 'updated_by'];

const named = (tables: PgTable[]) =>
  tables.map((table) => [getTableConfig(table).name, table] as [string, PgTable]);

let sql: ReturnType<typeof postgres>;
const catalogue = useTestDatabase((client) => (sql = client));

/** Every `*_by` foreign key `table` declares, keyed by column, as the catalogue reports it. */
async function byReferencesOf(table: string): Promise<Record<string, Reference>> {
  const rows = await sql<Reference[]>`
    select kcu.column_name,
           ref.table_name as foreign_table,
           ref.column_name as foreign_column
    from information_schema.referential_constraints rc
    join information_schema.key_column_usage kcu
      on kcu.constraint_schema = rc.constraint_schema
     and kcu.constraint_name = rc.constraint_name
    join information_schema.key_column_usage ref
      on ref.constraint_schema = rc.unique_constraint_schema
     and ref.constraint_name = rc.unique_constraint_name
     and ref.ordinal_position = kcu.position_in_unique_constraint
    where kcu.table_schema = 'public'
      and kcu.table_name = ${table}
      and right(kcu.column_name, 3) = '_by'
  `;
  return Object.fromEntries(rows.map((row) => [row.column_name, row]));
}

const USERS_ID = { foreign_table: 'users', foreign_column: 'id' };

describe('the audited tables', () => {
  it('are the eighteen the updated_at sweep names: sixteen audited, two stamped', () => {
    expect(AUDITED).toHaveLength(16);
    expect(STAMPED).toHaveLength(2);
    expect([...named(AUDITED), ...named(STAMPED)].map(([name]) => name).sort()).toEqual(
      AUDITED_TABLES,
    );
  });
});

describe.each(named(AUDITED))('%s', (name, table) => {
  const { byName, foreignKeyByColumn } = tableFacts(table);

  describe('in the schema', () => {
    it('spreads the six audit columns, the four stamps required', () => {
      for (const column of AUDIT_COLUMNS) {
        expect(byName[column]).toBeDefined();
      }
      for (const column of STAMP_COLUMNS) {
        expect(byName[column].notNull).toBe(true);
      }
      for (const column of DELETE_COLUMNS) {
        expect(byName[column].notNull).toBe(false);
      }
    });

    it('references users.id from every audit id (MB.5)', () => {
      for (const column of AUDIT_IDS) {
        expect(foreignKeyByColumn[column]).toBeDefined();
        expect(foreignKeyByColumn[column].foreignColumnName).toBe('id');
        expect(foreignKeyByColumn[column].foreignTable).toBe(users);
      }
    });
  });

  describe('in the catalogue', () => {
    it('carries the six audit columns', async () => {
      const columns = await catalogue.columnNames(name);

      // Precondition: the table exists, and is more than its audit columns.
      expect(columns.length).toBeGreaterThan(AUDIT_COLUMNS.length);
      expect(columns).toEqual(expect.arrayContaining([...AUDIT_COLUMNS]));
    });

    it('references users(id) from every audit id', async () => {
      const references = await byReferencesOf(name);

      for (const column of AUDIT_IDS) {
        expect(references[column]).toMatchObject(USERS_ID);
      }
    });
  });
});

describe.each(named(STAMPED))('%s', (name, table) => {
  const { byName, foreignKeyByColumn } = tableFacts(table);

  describe('in the schema', () => {
    it('spreads the four audit stamps, each required, and neither delete column', () => {
      for (const column of STAMP_COLUMNS) {
        expect(byName[column]).toBeDefined();
        expect(byName[column].notNull).toBe(true);
      }
      for (const column of DELETE_COLUMNS) {
        expect(byName[column]).toBeUndefined();
      }
    });

    it('references users.id from both stamp ids, and has no deleted_by to reference (MB.5)', () => {
      for (const column of STAMP_IDS) {
        expect(foreignKeyByColumn[column]).toBeDefined();
        expect(foreignKeyByColumn[column].foreignColumnName).toBe('id');
        expect(foreignKeyByColumn[column].foreignTable).toBe(users);
      }
      expect(foreignKeyByColumn.deleted_by).toBeUndefined();
    });
  });

  describe('in the catalogue', () => {
    it('carries the four stamp columns and neither delete column', async () => {
      const columns = await catalogue.columnNames(name);

      expect(columns.length).toBeGreaterThan(STAMP_COLUMNS.length);
      expect(columns).toEqual(expect.arrayContaining([...STAMP_COLUMNS]));
      for (const column of DELETE_COLUMNS) {
        expect(columns).not.toContain(column);
      }
    });

    it('references users(id) from both stamp ids, and nothing from a deleted_by', async () => {
      const references = await byReferencesOf(name);

      for (const column of STAMP_IDS) {
        expect(references[column]).toMatchObject(USERS_ID);
      }
      expect(references.deleted_by).toBeUndefined();
    });
  });
});

// Why the catalogue half could pass wrongly: it reads whatever the migrations
// built, so its discriminator is proved on real tables that carry no `*_by`.
describe.each(UNAUDITED_TABLES)('%s, unaudited', (name) => {
  it('exists, and carries no *_by column and no such reference', async () => {
    const columns = await catalogue.columnNames(name);

    expect(columns.length).toBeGreaterThan(0);
    expect(columns.filter((column) => column.endsWith('_by'))).toEqual([]);
    expect(await byReferencesOf(name)).toEqual({});
  });
});

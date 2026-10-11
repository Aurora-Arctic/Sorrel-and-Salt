import { describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { is } from 'drizzle-orm';
import { PgTable, getTableConfig } from 'drizzle-orm/pg-core';
import { useTestDatabase } from '../support/db/database';
import { tableFacts } from '../support/db/table-metadata';
import * as invitations from '@/modules/coven/schema/invitations';
import * as workspaces from '@/modules/coven/schema/workspaces';
import * as spellCategories from '@/modules/grimoire/schema/spell-categories';
import * as spellIngredients from '@/modules/grimoire/schema/spell-ingredients';
import * as spells from '@/modules/grimoire/schema/spells';
import * as adminRoleChangePauses from '@/modules/identity/schema/admin-role-change-pauses';
import * as auth from '@/modules/identity/schema/auth';
import * as userPrivilegeChanges from '@/modules/identity/schema/user-privilege-changes';
import * as users from '@/modules/identity/schema/users';
import * as ingredientCategories from '@/modules/ingredients/schema/ingredient-categories';
import * as ingredientDeities from '@/modules/ingredients/schema/ingredient-deities';
import * as ingredientFolkNames from '@/modules/ingredients/schema/ingredient-folk-names';
import * as ingredientSubstitutes from '@/modules/ingredients/schema/ingredient-substitutes';
import * as ingredients from '@/modules/ingredients/schema/ingredients';
import * as inventoryItems from '@/modules/ingredients/schema/inventory-items';
import * as referenceLinks from '@/modules/ingredients/schema/reference-links';
import * as references from '@/modules/ingredients/schema/references';
import * as retiredIngredientSlugs from '@/modules/ingredients/schema/retired-ingredient-slugs';
import * as astrology from '@/modules/vocabulary/schema/astrology';
import * as categories from '@/modules/vocabulary/schema/categories';
import * as deities from '@/modules/vocabulary/schema/deities';
import * as ingredientForms from '@/modules/vocabulary/schema/ingredient-forms';

// One comparison of the Drizzle schema against the migrated database, table by
// table, instead of a foreign-key, NOT NULL, type and index case in every module
// schema test: a schema file edited without its migration, or a migration
// without its schema file, fails here. What a table's rows may hold — its
// CHECKs, identity and tier rules — is its module schema test's
// (claude-docs/testing/db-harness.md, "The db test harness"). A schema file
// missing from the imports below leaves its table in the catalogue and out of
// the code's set, which the first test fails.

// The expand/contract window (CLAUDE.md rule 10): a drop is two PRs, the first
// removing the declaration and the second the object, so between them the
// migrated database holds what the schema no longer declares. An undeclare
// task adds its line here and the drop task removes it, so the window is
// declared rather than tolerated; a line outliving its drop fails below
// (claude-docs/testing/db-harness.md, "The db test harness").
const PENDING_DROPS: readonly {
  table: string;
  kind: 'column' | 'index' | 'check' | 'foreignKey' | 'table';
  name: string;
  droppedBy: string;
}[] = [];

const pendingIn = (table: string, kind: (typeof PENDING_DROPS)[number]['kind']) =>
  new Set(
    PENDING_DROPS.filter((drop) => drop.table === table && drop.kind === kind).map(
      (drop) => drop.name,
    ),
  );

const MODULES = [
  invitations,
  workspaces,
  spellCategories,
  spellIngredients,
  spells,
  adminRoleChangePauses,
  auth,
  userPrivilegeChanges,
  users,
  ingredientCategories,
  ingredientDeities,
  ingredientFolkNames,
  ingredientSubstitutes,
  ingredients,
  inventoryItems,
  referenceLinks,
  references,
  retiredIngredientSlugs,
  astrology,
  categories,
  deities,
  ingredientForms,
];

const TABLES = [
  ...new Set(
    MODULES.flatMap((module) => Object.values(module)).filter((value) => is(value, PgTable)),
  ),
] as PgTable[];

const byName = new Map(TABLES.map((table) => [getTableConfig(table).name, table]));
const NAMES = [...byName.keys()].sort();

/** `pg_constraint.confdeltype`, in the words Drizzle's `onDelete` uses. */
const ON_DELETE: Record<string, string> = {
  a: 'no action',
  r: 'restrict',
  c: 'cascade',
  n: 'set null',
  d: 'set default',
};

const byKey = <T extends { name: string }>(rows: T[]) =>
  [...rows].sort((a, b) => a.name.localeCompare(b.name));

/**
 * Drizzle's type name as `format_type` prints it: Postgres spells a bare
 * `timestamp` out in full and closes up a numeric's precision and scale.
 */
const asCatalogued = (type: string) =>
  type.replace(/, /g, ',').replace(/^timestamp(\(\d+\))?$/, 'timestamp$1 without time zone');

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

/** What the code declares of `table`: the same facts the catalogue is read for. */
function declared(table: PgTable) {
  const { columns, foreignKeys, checks, indexes } = tableFacts(table);
  return {
    columns: byKey(
      columns.map((column) => ({
        name: column.name,
        type: asCatalogued(column.getSQLType()),
        notNull: column.notNull,
        // A SQL default, a generated column or an identity — what the database
        // fills. `$defaultFn` is the client's and has no catalogue twin.
        hasDefault:
          column.default !== undefined ||
          column.generated !== undefined ||
          column.generatedIdentity !== undefined,
      })),
    ),
    foreignKeys: byKey(
      foreignKeys.map((foreignKey) => {
        const reference = foreignKey.reference();
        return {
          name: foreignKey.getName(),
          columns: reference.columns.map((column) => column.name),
          foreignTable: getTableConfig(reference.foreignTable).name,
          foreignColumns: reference.foreignColumns.map((column) => column.name),
          onDelete: foreignKey.onDelete ?? 'no action',
        };
      }),
    ),
    checks: checks.map((check) => check.name).sort(),
    indexes: byKey(
      indexes.map((index) => ({
        name: index.config.name as string,
        unique: index.config.unique,
        partial: index.config.where !== undefined,
      })),
    ),
  };
}

/** The same facts as the migrated database holds them. */
async function migrated(name: string) {
  const columns = await sql<
    { name: string; type: string; notNull: boolean; hasDefault: boolean }[]
  >`
    select c.column_name as name,
           format_type(a.atttypid, a.atttypmod) as type,
           c.is_nullable = 'NO' as "notNull",
           (c.column_default is not null or c.is_generated = 'ALWAYS' or c.is_identity = 'YES')
             as "hasDefault"
    from information_schema.columns c
    join pg_attribute a on a.attrelid = ${name}::regclass and a.attname = c.column_name
    where c.table_schema = 'public' and c.table_name = ${name}
  `;
  const foreignKeys = await sql<
    {
      name: string;
      columns: string[];
      foreignTable: string;
      foreignColumns: string[];
      onDelete: string;
    }[]
  >`
    select c.conname as name,
           array(select a.attname from unnest(c.conkey) with ordinality k(attnum, n)
                 join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
                 order by k.n)::text[] as columns,
           f.relname as "foreignTable",
           array(select a.attname from unnest(c.confkey) with ordinality k(attnum, n)
                 join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.attnum
                 order by k.n)::text[] as "foreignColumns",
           c.confdeltype as "onDelete"
    from pg_constraint c
    join pg_class f on f.oid = c.confrelid
    where c.conrelid = ${name}::regclass and c.contype = 'f'
  `;
  // `contype = 'c'` alone: Postgres 18 records NOT NULL as a constraint too
  // (`'n'`), which the column read above already covers.
  const checks = await sql<{ name: string }[]>`
    select conname as name from pg_constraint
    where conrelid = ${name}::regclass and contype = 'c'
  `;
  // An index backing a primary key or unique constraint is the constraint's,
  // not one the schema file's index list declares.
  const indexes = await sql<{ name: string; unique: boolean; partial: boolean }[]>`
    select ic.relname as name, i.indisunique as unique, i.indpred is not null as partial
    from pg_index i
    join pg_class ic on ic.oid = i.indexrelid
    where i.indrelid = ${name}::regclass
      and not exists (select 1 from pg_constraint k where k.conindid = i.indexrelid)
  `;

  return {
    columns: byKey(columns.map((row) => ({ ...row }))),
    foreignKeys: byKey(foreignKeys.map((row) => ({ ...row, onDelete: ON_DELETE[row.onDelete] }))),
    checks: checks.map((row) => row.name).sort(),
    indexes: byKey(indexes.map((row) => ({ ...row }))),
  };
}

/** The migrated facts less what `PENDING_DROPS` declares is on its way out. */
async function migratedAndKept(name: string) {
  const all = await migrated(name);
  const kept = <T extends { name: string } | string>(
    rows: T[],
    kind: 'column' | 'index' | 'check' | 'foreignKey',
  ) => {
    const pending = pendingIn(name, kind);
    return rows.filter((row) => !pending.has(typeof row === 'string' ? row : row.name));
  };
  return {
    columns: kept(all.columns, 'column'),
    foreignKeys: kept(all.foreignKeys, 'foreignKey'),
    checks: kept(all.checks, 'check'),
    indexes: kept(all.indexes, 'index'),
  };
}

/** The public tables the migrations built, as the catalogue lists them. */
async function migratedTables(): Promise<string[]> {
  const rows = await sql<{ name: string }[]>`
    select relname as name from pg_class
    where relnamespace = 'public'::regnamespace and relkind in ('r', 'p')
  `;
  return rows.map((row) => row.name).sort();
}

describe('the Drizzle schema against the migrated database', () => {
  it('declares exactly the tables the migrations built', async () => {
    const pending = new Set(
      PENDING_DROPS.filter((drop) => drop.kind === 'table').map((drop) => drop.table),
    );

    // Precondition: there is something to compare.
    expect(NAMES.length).toBeGreaterThan(0);
    expect((await migratedTables()).filter((name) => !pending.has(name))).toEqual(NAMES);
  });

  it.each(NAMES)(
    '%s: columns, types, foreign keys, CHECK names and indexes match',
    async (name) => {
      const code = declared(byName.get(name) as PgTable);
      const database = await migratedAndKept(name);

      expect(code.columns.length).toBeGreaterThan(0);
      expect(database).toEqual(code);
    },
  );

  // What makes the drop task remove its line: one left behind names an object
  // the catalogue no longer holds.
  it('declares a pending drop only for an object the database still holds', async () => {
    if (PENDING_DROPS.length === 0) {
      expect(PENDING_DROPS).toEqual([]);
      return;
    }
    const tables = await migratedTables();

    for (const drop of PENDING_DROPS) {
      expect(tables, drop.droppedBy).toContain(drop.table);
      if (drop.kind === 'table') continue;
      const held = await migrated(drop.table);
      const names = {
        column: held.columns.map((row) => row.name),
        foreignKey: held.foreignKeys.map((row) => row.name),
        check: held.checks,
        index: held.indexes.map((row) => row.name),
      }[drop.kind];
      expect(names, drop.droppedBy).toContain(drop.name);
    }
  });
});

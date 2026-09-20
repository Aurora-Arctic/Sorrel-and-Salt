import type { ForeignKey, PgTable } from 'drizzle-orm/pg-core';
import { getTableConfig } from 'drizzle-orm/pg-core';

// Transcribed, never read off `src/db/audit.ts`: a table compared against
// `Object.keys(auditColumns)` matches for any value of `auditColumns`, an
// empty one included (claude-docs/testing.md, "The db test harness").
export const STAMP_COLUMNS: readonly string[] = [
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
];

/** What a hard-deleted join table must not carry (MB.34). */
export const DELETE_COLUMNS: readonly string[] = ['deleted_at', 'deleted_by'];

export const AUDIT_COLUMNS: readonly string[] = [
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
  'deleted_at',
  'deleted_by',
];

// Transcribed so a catalogue sweep cannot pass on two empty sets. The three
// join tables are in it: they carry the four stamps and the trigger.
export const AUDITED_TABLES = [
  'categories',
  'category_groups',
  'ingredient_categories',
  'ingredient_folk_names',
  'ingredient_form_groups',
  'ingredient_forms',
  'ingredients',
  'inventory_items',
  'spell_categories',
  'spell_ingredients',
  'spells',
  'users',
  'workspace_invitations',
  'workspace_members',
  'workspaces',
].sort();

// Better Auth's adapter tables carry an `updated_at` and no `*_by` columns;
// Better Auth's own `$onUpdate` stamps them. A real counter-example for "only
// the audited tables".
export const UNAUDITED_TABLES = ['accounts', 'sessions', 'verifications'].sort();

export interface ForeignKeyFacts {
  /** The referencing column, on the table the facts were read from. */
  column: string;
  /** The constraint name, as Postgres reports it in `constraint_name`. */
  name: string;
  foreignColumnName: string;
  foreignTable: PgTable;
}

function foreignKeyFacts(fk: ForeignKey): ForeignKeyFacts {
  const { columns, foreignColumns, foreignTable } = fk.reference();
  return {
    column: columns[0].name,
    name: fk.getName(),
    foreignColumnName: foreignColumns[0].name,
    foreignTable,
  };
}

/** `getTableConfig` plus the lookups every schema test builds on top of it. */
export function tableFacts(table: PgTable) {
  const { columns, indexes, checks, primaryKeys, foreignKeys } = getTableConfig(table);
  const facts = foreignKeys.map(foreignKeyFacts);
  const auditColumnNames = new Set(AUDIT_COLUMNS);

  return {
    columns,
    indexes,
    checks,
    primaryKeys,
    foreignKeys,
    byName: Object.fromEntries(columns.map((column) => [column.name, column])),
    byIndexName: Object.fromEntries(indexes.map((index) => [index.config.name, index])),
    foreignKeyByColumn: Object.fromEntries(facts.map((fk) => [fk.column, fk])),
    /** The table's own references — the ones that are not an audit id pointing at `users`. */
    nonAuditForeignKeys: facts.filter((fk) => !auditColumnNames.has(fk.column)),
  };
}

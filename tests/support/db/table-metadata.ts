import type { ForeignKey, PgTable } from 'drizzle-orm/pg-core';
import { getTableConfig } from 'drizzle-orm/pg-core';
import type { ForeignKeyFacts } from './types';

// Transcribed, never read off `src/db/audit.ts`: a table compared against
// `Object.keys(auditColumns)` matches for any value of `auditColumns`, an
// empty one included (claude-docs/testing/db-harness.md, "The db test harness").
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

// Transcribed so a catalogue sweep cannot pass on two empty sets. The two
// hard-deleted join tables are in it: they carry the four stamps and the trigger.
// So are the two ledgers MB.194 superseded, which no schema declares since
// MB.196 but which the database holds until MB.197 drops them.
export const AUDITED_TABLES = [
  'admin_invitations',
  'admin_role_change_pauses',
  // Undeclared since MB.196, but in the catalogue until MB.197 drops it.
  'admin_role_changes',
  'categories',
  'category_groups',
  'deities',
  'deity_traditions',
  'ingredient_categories',
  'ingredient_deities',
  'ingredient_folk_names',
  'ingredient_substitutes',
  'ingredient_form_groups',
  'ingredient_forms',
  'ingredients',
  'invitations',
  'inventory_items',
  'planets',
  'reference_links',
  'references',
  'retired_ingredient_slugs',
  'spell_categories',
  'spell_ingredients',
  'spells',
  'user_privilege_changes',
  'users',
  // Undeclared since MB.196, but in the catalogue until MB.197 drops it.
  'workspace_creation_changes',
  'workspace_invitations',
  'workspace_members',
  'workspaces',
  'zodiac_signs',
].sort();

// The ledgers the database keeps append-only, each by a `forbid_rewrite`
// trigger refusing every update and delete (MB.194). Transcribed for the same
// reason as the list above: a sweep of the catalogue against itself passes empty.
export const APPEND_ONLY_TABLES = ['user_privilege_changes'];

// Better Auth's adapter tables that carry an `updated_at` and no audit id;
// Better Auth's own `$onUpdate` stamps them. `sessions.impersonated_by` is the
// `admin` plugin's column (MB.53), not an audit id. A real counter-example
// for "only the audited tables". `rate_limits` has no `updated_at` to mistake.
export const UNAUDITED_TABLES = ['accounts', 'sessions', 'verifications'].sort();

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

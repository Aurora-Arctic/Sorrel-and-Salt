import { eq, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { auditColumns } from '../../modules/identity/schema/users';
import type { Membership } from '@/modules/coven';

export type AuditColumnName = keyof typeof auditColumns;

// A table admits the methods its own columns allow: `{ deletedAt?: never }` is
// satisfied only by a table without the column.
export type SoftDeletable = { deletedAt: AnyPgColumn };
export type HardDeletable = { deletedAt?: never };

// The same shape for rule 5's proof: a table carrying `workspace_id` scopes
// itself and may only be reached with a `Membership`, and `{ workspaceId?:
// never }` is the complement — every other table.
export type WorkspaceScoped = { workspaceId: AnyPgColumn };
export type Unscoped = { workspaceId?: never };

// And once more for visibility (M10.3), so that a table goes through exactly
// one finder — claude-docs/db.md, "Spell visibility". `spells` is
// workspace-scoped *and* carries a per-row reader rule, so `NotVisibilityScoped`
// takes it off the generic scoped finders and `findManySpells`/`findOneSpell`
// name it directly; the two join tables carry a `spell_id` and no workspace of
// their own, so `NotSpellScoped` takes them off the unscoped finders and
// `findManyInSpell` derives both scopes from the parent spell.
export type NotVisibilityScoped = { visibility?: never };
export type SpellScoped = { spellId: AnyPgColumn };
export type NotSpellScoped = { spellId?: never };

// And for an ingredient's children (M4.8): `ingredient_folk_names` and
// `ingredient_categories` carry an `ingredient_id` and no workspace of their
// own, so they would pass as `Unscoped` while holding a coven's rows.
// `NotIngredientScoped` takes them off the unscoped finders, and
// `findManyOfIngredients` reads them under the parent's tier.
export type IngredientScoped = { ingredientId: AnyPgColumn };
export type NotIngredientScoped = { ingredientId?: never };

/** A table with a surrogate key, which is every one but the three join tables. */
export type Identified = { id: AnyPgColumn };

/** A table's own columns, with every audit column removed — they come from the session. */
export type Writable<TTable extends PgTable> = Omit<TTable['$inferInsert'], AuditColumnName>;

/** The same, minus `workspaceId` — it comes from the proof, for the same reason. */
export type WritableInWorkspace<TTable extends PgTable> = Omit<Writable<TTable>, 'workspaceId'>;

/**
 * The proof's own predicate. Built here rather than by the caller: a
 * `workspaceId` passed alongside the proof is a second source that can
 * disagree with it.
 */
export function scopedTo<TTable extends PgTable & WorkspaceScoped>(
  membership: Membership,
  table: TTable,
): SQL {
  return eq(table.workspaceId, membership.workspaceId);
}

/**
 * `deleted_at IS NULL`, or `undefined` for a table without the column. Decided
 * by the table's shape, so there is no flag a caller could pass to skip it.
 */
export function notSoftDeleted<TTable extends PgTable>(table: TTable): SQL | undefined {
  const deletedAt = (table as Partial<SoftDeletable>).deletedAt;
  return deletedAt ? sql`${deletedAt} is null` : undefined;
}

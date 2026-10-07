import { eq, ilike, isNull, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { Membership } from '@/modules/coven';
import type { SoftDeletable, WorkspaceScoped } from './types';

// The `where` predicates the finders and the writer share: a proof's workspace,
// the compendium tier, the soft-delete filter, and the admin lists' text match.

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
 * The compendium tier, `workspace_id IS NULL`: what any proof, and no proof,
 * may read. A finder reading both tiers ORs it with `scopedTo`, so each half
 * of "the compendium or this coven" has one spelling (claude-docs/modules.md,
 * "The tier seam").
 */
export function inCompendium<TTable extends PgTable & WorkspaceScoped>(table: TTable): SQL {
  return isNull(table.workspaceId);
}

/**
 * `deleted_at IS NULL`, or `undefined` for a table without the column. Decided
 * by the table's shape, so there is no flag a caller could pass to skip it.
 */
export function notSoftDeleted<TTable extends PgTable>(table: TTable): SQL | undefined {
  const deletedAt = (table as Partial<SoftDeletable>).deletedAt;
  return deletedAt ? isNull(deletedAt) : undefined;
}

/**
 * `column` holds `query` anywhere, case-insensitively, its `%`, `_` and `\`
 * read literally: how an admin list narrows by a typed fragment. `ilike` rather
 * than a trigram match: an admin looks a row up by part of a name or an
 * address, which similarity scores poorly. Postgres' default LIKE escape is
 * the backslash.
 */
export function containsText(column: AnyPgColumn, query: string): SQL {
  return ilike(column, `%${query.replace(/[\\%_]/g, '\\$&')}%`);
}

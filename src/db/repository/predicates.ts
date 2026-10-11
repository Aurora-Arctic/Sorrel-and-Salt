import { and, eq, ilike, isNull, or, sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { Membership } from '@/modules/coven';
import type { SoftDeletable, WordMatch, WorkspaceScoped } from './types';

// The `where` predicates the finders and the writer share: a proof's workspace,
// the compendium tier and the two read together, the soft-delete filter, and
// the text matches — the admin lists' fragment, the fold, and the trigram and
// accent-folded word matches. Nothing here builds a query: `select.ts` imports
// this file, so `readableIngredientParent`, built on its `existsIn`, lives in
// `ingredient-parent.ts`.

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
 * The tiers `memberships` may read: the compendium's rows, or those of a coven
 * one of them proves. No proofs is the compendium alone, which is how a
 * signed-out request and an admin's compendium form read. The tier and nothing
 * else: `readableInTiers` adds the row's own tombstone filter, and
 * `readableIngredientParent` in `ingredient-parent.ts` reads it through
 * `existsIn`, which adds the parent's, so neither statement reads it twice.
 * Unfiltered by itself only in the spell hatch, whose ingredient may be
 * deleted (M5.3).
 */
export function inTiers<TTable extends PgTable & WorkspaceScoped>(
  memberships: readonly Membership[],
  table: TTable,
): SQL | undefined {
  return or(inCompendium(table), ...memberships.map((membership) => scopedTo(membership, table)));
}

/**
 * Live, and in a tier `memberships` may read: a two-tier table's read scope,
 * one spelling for every finder reading the compendium and the proofs' covens
 * together (claude-docs/modules.md, "The tier seam").
 */
export function readableInTiers<TTable extends PgTable & WorkspaceScoped>(
  memberships: readonly Membership[],
  table: TTable,
): SQL | undefined {
  return and(inTiers(memberships, table), notSoftDeleted(table));
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

/**
 * Each entry of a `text[]` column, trimmed and lower-cased as the suggestions
 * fold a value (MB.162), as a subquery: what an `inArray` matches a folded
 * value against, so a list holds a value whatever spacing or case an entry
 * was written with.
 */
export function listFolds(list: AnyPgColumn): SQL {
  const entry = sql.identifier('entry');
  return sql`(select ${fold(entry)} from unnest(${list}) as ${entry})`;
}

/**
 * `value` trimmed and lower-cased: the fold a suggestion, a list entry and an
 * ingredient's form are compared under (MB.162), and `canonical_key`'s own.
 * Raw, since neither function has a builder.
 */
export function fold(value: SQLWrapper | string): SQL {
  return sql`lower(btrim(${value}))`;
}

/**
 * `text` is trigram-similar to `query` as a whole (`%`), or holds a run of
 * words like it (`<%`): how an autofill matches a name or a written value, so
 * it finds a near spelling and completes a typed prefix. Raw, since neither
 * operator has a builder; parenthesised, so it ANDs as one arm. The thresholds
 * are the read's (claude-docs/db/member-autofill.md, "The member's autofill").
 */
export function trigramMatch(text: SQLWrapper, query: string): SQL {
  return sql`(${text} % ${query} or ${query} <% ${text})`;
}

/**
 * A search for `query` — trimmed, never blank — by word similarity: `matches`
 * holds where it is word-similar (`<%`) to a text and `similarity` scores it,
 * each side folded through `unaccent_immutable`, so the expression indexes of
 * migration 0027 answer the match. The compendium search and the reference
 * picker's (claude-docs/db/compendium-read.md, "The compendium read").
 */
export function foldedWordMatch(query: string): WordMatch {
  const folded = sql`unaccent_immutable(${query})`;
  return {
    matches: (text) => sql`${folded} <% unaccent_immutable(${text})`,
    similarity: (text) => sql<number>`word_similarity(${folded}, unaccent_immutable(${text}))`,
  };
}

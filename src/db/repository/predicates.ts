import { and, eq, gt, ilike, isNull, or, sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { Membership } from '@/modules/coven';
import type { SoftDeletable, SortPart, VariantScoped, WordMatch, WorkspaceScoped } from './types';

// Nothing here builds a query; `readableIngredientParent` lives in `ingredient-parent.ts` because `select.ts` imports this file.

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
 * The compendium tier, `workspace_id IS NULL`: what any proof, and no proof, may read. A finder reading both tiers ORs it
 * with `scopedTo` (claude-docs/db/tier-seam.md, "The tier seam").
 */
export function inCompendium<TTable extends PgTable & WorkspaceScoped>(table: TTable): SQL {
  return isNull(table.workspaceId);
}

/**
 * The tiers `memberships` may read: the compendium's rows, or those of a coven one of them proves. No proofs is the
 * compendium alone. The tier only: `readableInTiers` and `existsIn` add the tombstone filters, so neither is read twice.
 * Unfiltered by itself only in the spell hatch, whose ingredient may be deleted.
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
 * together (claude-docs/db/tier-seam.md, "The tier seam").
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

export function noEndOrAhead(until: AnyPgColumn): SQL {
  return or(isNull(until), gt(until, sql`now()`)) as SQL;
}

/**
 * An ingredient's own rows, `variant_id IS NULL`, or `undefined` for a table with no variant column. The union rule as a
 * predicate (DESIGN.md §5): an ingredient's lists are its own rows and a form's are its additions, never read as one.
 */
export function ownedByIngredient<TTable extends PgTable>(table: TTable): SQL | undefined {
  const variantId = (table as Partial<VariantScoped>).variantId;
  return variantId ? isNull(variantId) : undefined;
}

// Reads `%`, `_` and `\` in a LIKE pattern literally.
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&');
}

/**
 * `column` holds `query` anywhere, case-insensitively, its `%`, `_` and `\` read literally: how an admin list narrows by
 * a fragment. `ilike` rather than trigram, which scores part of a name or address poorly.
 */
export function containsText(column: AnyPgColumn, query: string): SQL {
  return ilike(column, `%${escapeLike(query)}%`);
}

export function startsWithText(column: AnyPgColumn, prefix: string): SQL {
  return ilike(sql`${column}::text`, `${escapeLike(prefix)}%`);
}

/**
 * Each entry of a `text[]` column, trimmed and lower-cased as the suggestions fold a value, as a subquery for `inArray`,
 * so a list holds a value whatever its spacing or case.
 */
export function listFolds(list: SQLWrapper): SQL {
  const entry = sql.identifier('entry');
  return sql`(select ${fold(entry)} from unnest(${list}) as ${entry})`;
}

/**
 * `value` trimmed and lower-cased: the fold a suggestion, a list entry and a
 * form are compared under, and `ingredient_variants_form_unique`'s own.
 * Raw, since neither function has a builder.
 */
export function fold(value: SQLWrapper | string): SQL {
  return sql`lower(btrim(${value}))`;
}

/**
 * `left` equals `right`, case aside. Raw, as `lower` has no builder. Neither side is trimmed: the JS fold in `lib/text.ts` also trims, so a
 * caller holding a JS-folded value compares it to `fold(column)` instead.
 */
export function caseFoldedEq(left: SQLWrapper, right: SQLWrapper | string): SQL {
  return eq(sql`lower(${left})`, sql`lower(${right})`);
}

/**
 * `text` is trigram-similar to `query` as a whole (`%`) or holds a run of words like it (`<%`): how an autofill finds a near
 * spelling and completes a prefix. Raw, as neither operator has a builder, and parenthesised to AND as one arm
 * (claude-docs/db/member-autofill.md, "The member's autofill").
 */
export function trigramMatch(text: SQLWrapper, query: string): SQL {
  return sql`(${text} % ${query} or ${query} <% ${text})`;
}

/**
 * Where a search's `position` puts a field holding the query nowhere, so fuzzy hits follow verbatim ones: the largest
 * `integer`. Not null, as a null part makes a keyset cursor comparison null and the row falls out of every page.
 */
const NOWHERE = 2147483647;

/**
 * A search for `query` by word similarity: `matches`, `similarity`, `contains` and
 * `position` (the first character of a verbatim hit, or `NOWHERE`), each side folded
 * through `unaccent_immutable` so the expression indexes answer the match.
 * (claude-docs/db/compendium-read.md, "Search ranking")
 */
export function foldedWordMatch(query: string): WordMatch {
  const folded = sql`unaccent_immutable(${query})`;
  const at = (text: AnyPgColumn) =>
    sql<number>`strpos(lower(unaccent_immutable(${text})), lower(${folded}))`;
  return {
    matches: (text) => sql`${folded} <% unaccent_immutable(${text})`,
    similarity: (text) => sql<number>`word_similarity(${folded}, unaccent_immutable(${text}))`,
    contains: (text) => gt(at(text), 0),
    // `nullif` and `coalesce` have no builder.
    position: (text) => sql<number>`coalesce(nullif(${at(text)}, 0), ${sql.raw(String(NOWHERE))})`,
  };
}

/**
 * The natural-language collation facet lists and the category picker sort names under: case set aside, accents beside
 * plain letters. Named rather than the database default so the order is the same everywhere; needs Postgres built with ICU.
 */
export const NATURAL_COLLATION = sql.raw('"en-US-x-icu"');

/** `value` sorted under `NATURAL_COLLATION`: the one place the COLLATE clause is written. */
export function naturally(value: SQL | AnyPgColumn): SQL {
  return sql`${value} collate ${NATURAL_COLLATION}`;
}

/**
 * An instant, newest first, as a cursor key part: a page's key is ascending, so the instant is negated. `numeric` keeps
 * the microseconds a `Date` would drop from a cursor. Rows of one instant follow by id, which the pager adds.
 */
export const newestFirst = (column: AnyPgColumn): SortPart => ({
  expression: sql`-extract(epoch from ${column})`,
  type: 'numeric',
});

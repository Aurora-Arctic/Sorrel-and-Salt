import { and, eq, inArray, isNotNull, not, or, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import {
  referenceLinks,
  SOURCED,
  type SourcedKey,
} from '../../modules/ingredients/schema/reference-links';
import { references } from '../../modules/ingredients/schema/references';
import type { Membership } from '@/modules/coven';
import type { PageEntry, PageRequest } from '../../lib/types';
import { findPageInTiers } from './finders';
import { inUseIngredientParent, inUseVariantParent } from './ingredient-parent';
import { foldedWordMatch, inCompendium, notSoftDeleted, readableInTiers } from './predicates';
import { existsIn, selectFrom } from './select';
import type {
  CitingLink,
  CompendiumScore,
  JoinedRow,
  ListOrder,
  ReferenceLinkRow,
  ReferenceRow,
} from './types';

// A reference and the links that cite it (claude-docs/db/references.md).
// Two tiers, as ingredients are: every read is the compendium's and the
// proofs' covens', and a link reads only where the tier rule lets its row's
// readers look, so a link written past the service's rule shows nothing.

/**
 * The live links of these rows of the sourced table `key` names, each beside the
 * live reference it cites, read only where the reader may read the reference:
 * the compendium's or its own coven's. One statement for the whole batch. (claude-docs/db/write-path.md, "Reading the links that cite references")
 */
export async function findReferencesOf(
  memberships: readonly Membership[],
  key: SourcedKey,
  ids: readonly string[],
  heldBy?: Membership,
): Promise<CitingLink[]> {
  if (ids.length === 0) return [];
  const column = referenceLinks[key];
  const { table } = SOURCED[key];
  // An ingredient's reference, or one form's, may be the compendium's or the
  // ingredient's own coven's; `ingredients` is the parent the EXISTS reads.
  const inParentsTier = or(
    inCompendium(references),
    eq(references.workspaceId, ingredients.workspaceId),
  );
  const readable =
    table === ingredients
      ? inUseIngredientParent(memberships, column, heldBy, inParentsTier)
      : table === ingredientVariants
        ? inUseVariantParent(memberships, column, heldBy, inParentsTier)
        : and(existsIn(table, eq(table.id, column)), inCompendium(references));
  const rows: JoinedRow<ReferenceLinkRow, ReferenceRow>[] = await selectFrom(
    referenceLinks,
    and(
      notSoftDeleted(referenceLinks),
      inArray(column, [...ids]),
      // A missing or deleted reference is a null joined row, whose tier
      // would otherwise read as the compendium's.
      isNotNull(references.id),
      readable,
    ),
    {
      leftJoin: references,
      on: and(eq(references.id, referenceLinks.referenceId), notSoftDeleted(references)) as SQL,
    },
  );
  return rows.flatMap(({ row, joined }) => (joined ? [{ link: row, reference: joined }] : []));
}

/**
 * The live references among these ids, in the compendium or in a coven one of
 * `memberships` proves: what a row written under those proofs may cite. No
 * proofs reads the compendium alone, which is what a compendium entry cites.
 */
export function findManyReferences(
  memberships: readonly Membership[],
  ids: readonly string[],
): Promise<ReferenceRow[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return selectFrom(
    references,
    and(readableInTiers(memberships, references), inArray(references.id, [...ids])),
  );
}

/**
 * One page of the live references an ingredient may cite (the compendium's and those of a coven a proof in `memberships` names) whose
 * authors, title or container is word-similar to `query`, accent-folded, best match first. No proofs reads the compendium's alone. A blank
 * `query` lists by title. Matches the fields, as the rendered citation exists only in TypeScript (claude-docs/db/references.md).
 */
export function findReferenceSuggestions(
  memberships: readonly Membership[],
  query: string,
  page: PageRequest,
): Promise<PageEntry<ReferenceRow, CompendiumScore>[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    const byTitle: ListOrder<CompendiumScore> = {
      sort: [references.title],
      carry: { score: sql<number | null>`null` },
    };
    return findPageInTiers(memberships, references, byTitle, page);
  }

  const { matches, similarity, contains } = foldedWordMatch(trimmed);
  const fields = [references.authors, references.title, references.container];
  // A field's word similarity, or 1 where it holds the query verbatim, as the compendium search scores a field before its weight;
  // `greatest` skips nulls, so a source scores on the fields it has.
  const scored = (field: AnyPgColumn) =>
    sql`greatest(${similarity(field)}, case when ${and(matches(field), contains(field))} then 1::real end)`;
  const score = sql<number>`greatest(${sql.join(fields.map(scored), sql`, `)})`;
  const bestMatch: ListOrder<CompendiumScore> = {
    sort: [{ expression: sql`-${score}`, type: 'real' }, references.title],
    wordMatch: true,
    carry: { score },
  };
  return findPageInTiers(memberships, references, bestMatch, page, or(...fields.map(matches)));
}

/**
 * A row of the sourced table `key` names that shows a reference: a live link
 * to a live compendium reference. Correlated on the outer row of that table.
 */
export function cites(key: SourcedKey): SQL {
  return existsIn(
    referenceLinks,
    and(
      eq(referenceLinks[key], SOURCED[key].table.id),
      existsIn(
        references,
        and(eq(references.id, referenceLinks.referenceId), inCompendium(references)),
      ),
    ),
  );
}

/**
 * A row of the sourced table `key` names with no live link to a live compendium reference, which a compendium entry reads as an
 * empty bibliography: the admin's to-do list. Correlated on that table's outer row.
 */
export function citesNothing(key: SourcedKey): SQL {
  return not(cites(key));
}

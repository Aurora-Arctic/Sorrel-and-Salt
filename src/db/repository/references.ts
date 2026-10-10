import { and, eq, inArray, isNotNull, not, or, sql, type SQL } from 'drizzle-orm';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { referenceLinks } from '../../modules/ingredients/schema/reference-links';
import { references } from '../../modules/ingredients/schema/references';
import type { Membership } from '@/modules/coven';
import type { PageEntry, PageRequest } from '../../lib/types';
import { findPageInTiers } from './finders';
import {
  foldedWordMatch,
  inCompendium,
  notSoftDeleted,
  readableIngredientParent,
  readableInTiers,
} from './predicates';
import { existsIn, selectFrom } from './select';
import type {
  CitingLink,
  CompendiumScore,
  JoinedRow,
  ListOrder,
  ReferenceLinkRow,
  ReferenceRow,
} from './types';

// A reference and the links that cite it (MB.151; claude-docs/db/references.md).
// Two tiers, as ingredients are: every read is the compendium's and the
// proofs' covens', and a link reads only where the tier rule lets its row's
// readers look, so a link written past the service's rule shows nothing.

/**
 * The live links of these ingredients, each beside the live reference it
 * cites. Readable exactly when the parent is, as `findManyOfIngredients` reads
 * it — live, and in the compendium or a coven one of `memberships` proves —
 * and only where the reference is one the parent's readers may read: the
 * compendium's, or the parent's own coven's. A link to a soft-deleted
 * reference reads as nothing and is left in place, so a restore returns it
 * (DESIGN.md §5, "Nothing deletes a reference in v1"). One statement for the
 * whole batch: the reference a left join read as an inner one, since the
 * parent's correlated subquery compares its tier with the reference's.
 */
export async function findReferencesOfIngredients(
  memberships: readonly Membership[],
  ingredientIds: readonly string[],
): Promise<CitingLink[]> {
  if (ingredientIds.length === 0) return [];
  const rows: JoinedRow<ReferenceLinkRow, ReferenceRow>[] = await selectFrom(
    referenceLinks,
    and(
      notSoftDeleted(referenceLinks),
      inArray(referenceLinks.ingredientId, [...ingredientIds]),
      // A missing or deleted reference is a null joined row, whose tier
      // would otherwise read as the compendium's.
      isNotNull(references.id),
      readableIngredientParent(
        memberships,
        referenceLinks.ingredientId,
        or(inCompendium(references), eq(references.workspaceId, ingredients.workspaceId)),
      ),
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
 * One page of the live references an ingredient may cite — the compendium's
 * and those of a coven one of `memberships` proves (MB.151) — whose authors,
 * title or container is word-similar to `query`, each side accent-folded as
 * the compendium search folds names, best match first and keyed `[-score,
 * title]`. No proofs reads the compendium's alone, which is what a compendium
 * entry may cite (M5.5). A blank `query` lists the tiers read by title. The
 * rendered citation exists only in TypeScript, so this matches the fields it
 * is rendered from (claude-docs/db/references.md).
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

  const { matches, similarity } = foldedWordMatch(trimmed);
  const fields = [references.authors, references.title, references.container];
  // `greatest` skips nulls, so a source without authors or a container
  // scores on what it has.
  const score = sql<number>`greatest(${sql.join(fields.map(similarity), sql`, `)})`;
  const bestMatch: ListOrder<CompendiumScore> = {
    sort: [{ expression: sql`-${score}`, type: 'real' }, references.title],
    wordMatch: true,
    carry: { score },
  };
  return findPageInTiers(memberships, references, bestMatch, page, or(...fields.map(matches)));
}

/**
 * An ingredient with no reference it shows: no live link to a live
 * compendium reference, the bibliography a compendium entry reads as empty —
 * the admin's to-do list (M5.5). Correlated on the outer `ingredients` row.
 */
export function citesNothing(): SQL {
  return not(
    existsIn(
      referenceLinks,
      and(
        eq(referenceLinks.ingredientId, ingredients.id),
        existsIn(
          references,
          and(eq(references.id, referenceLinks.referenceId), inCompendium(references)),
        ),
      ),
    ),
  );
}

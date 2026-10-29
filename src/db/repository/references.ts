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
 * The live links of these rows of the sourced table `key` names (the
 * `SOURCED` list), each beside the live reference it cites. An ingredient's read
 * exactly when it is, as `findManyOfIngredients` reads it — live, and in the
 * compendium or a coven one of `memberships` proves — and only where the
 * reference is one its readers may read: the compendium's, or its own
 * coven's. A variant's the same, through the variant to its ingredient
 * (`readableVariantParent`): a variant is a coven's where its
 * ingredient is, though it carries no `workspace_id`. Every other sourced table is global reference data, so its links
 * read while the row is live, and only to a compendium reference, the one
 * tier every reader shares. A link to a soft-deleted reference reads as
 * nothing and is left in place, so a restore returns it (DESIGN.md §5,
 * "Nothing deletes a reference in v1"). One statement for the whole batch:
 * the reference a left join read as an inner one, since the parent's
 * correlated subquery compares its tier with the reference's.
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
 * One page of the live references an ingredient may cite — the compendium's
 * and those of a coven one of `memberships` proves — whose authors,
 * title or container is word-similar to `query`, each side accent-folded as
 * the compendium search folds names, best match first and keyed `[-score,
 * title]`. No proofs reads the compendium's alone, which is what a compendium
 * entry may cite. A blank `query` lists the tiers read by title. The
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

  const { matches, similarity, contains } = foldedWordMatch(trimmed);
  const fields = [references.authors, references.title, references.container];
  // A field's word similarity, or 1 where it matched and holds the query
  // verbatim, as the compendium search scores a field before its weight: word
  // similarity scores a fragment inside a longer word by the trigrams it
  // shares. `greatest` skips nulls, so a source without authors or a
  // container scores on what it has.
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
 * A row of the sourced table `key` names with no reference it shows: no
 * live link to a live compendium reference, the bibliography a compendium
 * entry reads as empty — the admin's to-do list. Correlated on the
 * outer row of that table.
 */
export function citesNothing(key: SourcedKey): SQL {
  return not(cites(key));
}

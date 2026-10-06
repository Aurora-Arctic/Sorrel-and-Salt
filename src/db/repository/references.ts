import { and, eq, inArray, isNotNull, not, or, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { referenceLinks } from '../../modules/ingredients/schema/reference-links';
import { references } from '../../modules/ingredients/schema/references';
import type { Membership } from '@/modules/coven';
import type { PageEntry, PageRequest } from '../../lib/types';
import { inCompendium, notSoftDeleted, scopedTo } from './predicates';
import { existsIn, pageBounds, selectFrom } from './select';
import type {
  CitingLink,
  CompendiumScore,
  JoinedRow,
  Keyset,
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
      existsIn(
        ingredients,
        and(
          eq(ingredients.id, referenceLinks.ingredientId),
          or(
            inCompendium(ingredients),
            ...memberships.map((membership) => scopedTo(membership, ingredients)),
          ),
          or(inCompendium(references), eq(references.workspaceId, ingredients.workspaceId)),
        ),
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
    and(
      or(
        inCompendium(references),
        ...memberships.map((membership) => scopedTo(membership, references)),
      ),
      notSoftDeleted(references),
      inArray(references.id, [...ids]),
    ),
  );
}

/**
 * One page of the live references a coven's ingredient may cite — the
 * compendium's and the proof's coven's (MB.151) — whose authors, title or
 * container is word-similar to `query`, each side accent-folded as the
 * compendium search folds names, best match first and keyed `[-score,
 * title]`. A blank `query` lists both tiers by title. The rendered citation
 * exists only in TypeScript, so this matches the fields it is rendered from
 * (claude-docs/db/references.md).
 */
export function findReferenceSuggestions(
  membership: Membership,
  query: string,
  page: PageRequest,
): Promise<PageEntry<ReferenceRow, CompendiumScore>[]> {
  const trimmed = query.trim();
  const scope = and(
    or(inCompendium(references), scopedTo(membership, references)),
    notSoftDeleted(references),
  );
  if (!trimmed) {
    const keyset: Keyset<CompendiumScore> = {
      sort: [references.title],
      id: references.id,
      request: page,
      carry: { score: sql<number | null>`null` },
    };
    return selectFrom(references, and(scope, pageBounds(keyset)), keyset);
  }

  const folded = sql`unaccent_immutable(${trimmed})`;
  const fields = [references.authors, references.title, references.container];
  const matches = (text: AnyPgColumn) => sql`${folded} <% unaccent_immutable(${text})`;
  // `greatest` skips nulls, so a source without authors or a container
  // scores on what it has.
  const score = sql<number>`greatest(${sql.join(
    fields.map((text) => sql`word_similarity(${folded}, unaccent_immutable(${text}))`),
    sql`, `,
  )})`;
  const keyset: Keyset<CompendiumScore> = {
    sort: [{ expression: sql`-${score}`, type: 'real' }, references.title],
    id: references.id,
    wordMatch: true,
    request: page,
    carry: { score },
  };
  return selectFrom(references, and(scope, or(...fields.map(matches)), pageBounds(keyset)), keyset);
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

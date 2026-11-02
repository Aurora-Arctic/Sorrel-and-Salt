import 'server-only';
import { findCompendiumReview, findOneIngredient } from '../../../db/repository';
import { Forbidden, NotFound } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { RowId } from '../../../lib/validation';
import { referencesOf, referencesOfVariants, variantsOf } from './ingredient-children';
import { sourcingScore } from './sourcing-score';
import type { SourcingChildren, SourcingScore } from '../types';
import { assertCurator } from '@/modules/identity';

/** One child read's single answer, or its refusal thrown. */
function answered<Row>(answer: Row | Forbidden | undefined): Row {
  if (answer instanceof Forbidden || answer === undefined) throw answer ?? new Forbidden();
  return answer;
}

/** The children the score reads without a request's loaders, as the admin page does: one batch each. */
function childrenFor(session: Session): SourcingChildren {
  return {
    variants: async (entry) => answered((await variantsOf(session, [entry]))[0]),
    references: async (entry) => answered((await referencesOf(session, [entry]))[0]),
    variantReferences: async (variants) =>
      (await referencesOfVariants(session, variants)).map((answer) => answered(answer)),
  };
}

/**
 * A compendium entry's sourcing score and the facts behind it, for a curator or an admin: what the admin entry page shows.
 * `children` are the request's loaders under GraphQL, so a page of entries reads its forms and citations in one batch.
 *
 * @throws {Forbidden} `session` is neither a curator nor an admin.
 * @throws {NotFound} `id` names no live compendium entry, a coven's ingredient included.
 */
export async function readSourcingScore(
  session: Session,
  id: string,
  children: SourcingChildren = childrenFor(session),
): Promise<SourcingScore> {
  const curator = assertCurator(session);
  const review = RowId.safeParse(id).success ? await findCompendiumReview(curator, id) : undefined;
  const entry = review && (await findOneIngredient([], id));
  if (!review || !entry) throw new NotFound('No such compendium entry');
  const [references, variants] = await Promise.all([
    children.references(entry),
    children.variants(entry),
  ]);
  const variantReferences = await children.variantReferences(variants);
  const score = sourcingScore({
    entry: { ...entry, reviewed: review.reviewedAt !== null },
    references,
    forms: variants.map((variant, index) => ({
      safetyNotes: variant.safetyNotes,
      references: variantReferences[index] ?? [],
    })),
  });
  if (!score) throw new NotFound('No such compendium entry');
  return score;
}

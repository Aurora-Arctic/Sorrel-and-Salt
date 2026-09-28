import 'server-only';
import { findManyByIds, findManyOfIngredients } from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { ingredientCategories } from '../schema/ingredient-categories';
import { ingredientFolkNames } from '../schema/ingredient-folk-names';
import type { ingredients } from '../schema/ingredients';
import { categories } from '@/modules/vocabulary/schema/categories';
import { type Membership, assertMembership } from '@/modules/coven';

/**
 * An ingredient as its children's loaders key it: the row a resolver already
 * holds. `workspaceId` says which proof to ask for; it is never the scope —
 * the read takes that from the proofs, so a key claiming the wrong tier is
 * answered with nothing.
 */
export type IngredientRef = Pick<typeof ingredients.$inferSelect, 'id' | 'workspaceId'>;

export type CategoryRow = typeof categories.$inferSelect;

/**
 * The categories each ingredient is filed under, one answer per ref in the
 * order given, each sorted by name: a DataLoader's batch. Two reads whatever
 * the batch size, plus one role lookup per coven named.
 *
 * A compendium entry answers anyone, signed out included (MB.80); a
 * workspace entry answers members of its coven, and any other caller gets a
 * `Forbidden` in that ref's slot while the rest of the batch stands.
 */
export async function categoriesOf(
  session: Session | null,
  refs: readonly IngredientRef[],
): Promise<(CategoryRow[] | Forbidden)[]> {
  const { admitted, answer } = await admit(session, refs);
  const links = await admitted(ingredientCategories);
  const rows = await findManyByIds(categories, [...new Set(links.map((link) => link.categoryId))]);
  const byId = new Map(rows.map((category) => [category.id, category]));

  return answer((id) =>
    links
      .filter((link) => link.ingredientId === id)
      // A soft-deleted category is absent from `byId`, so its link renders nothing.
      .flatMap((link) => byId.get(link.categoryId) ?? [])
      .sort(byName),
  );
}

/**
 * The live folk names of each ingredient, flattened to strings as §7's
 * `folkNames: [String!]!` exposes them — one answer per ref, sorted. One read
 * whatever the batch size, plus one role lookup per coven named; refused
 * exactly as `categoriesOf` refuses.
 */
export async function folkNamesOf(
  session: Session | null,
  refs: readonly IngredientRef[],
): Promise<(string[] | Forbidden)[]> {
  const { admitted, answer } = await admit(session, refs);
  const rows = await admitted(ingredientFolkNames);

  return answer((id) =>
    rows
      .filter((row) => row.ingredientId === id)
      .sort(byName)
      .map((row) => row.name),
  );
}

/**
 * The check both reads share: a proof for every coven the refs name that this
 * session may read, and a `Forbidden` for each that it may not. `admitted`
 * reads a child table for the refs that passed; `answer` lays the result out
 * in ref order.
 */
async function admit(session: Session | null, refs: readonly IngredientRef[]) {
  const covens = [...new Set(refs.flatMap((ref) => ref.workspaceId ?? []))];
  const proofs = await Promise.all(covens.map((workspaceId) => proofFor(session, workspaceId)));
  const refused = new Set(covens.filter((_, i) => !proofs[i]));
  const memberships = proofs.filter((proof): proof is Membership => proof !== undefined);

  const isRefused = (ref: IngredientRef) =>
    ref.workspaceId !== null && refused.has(ref.workspaceId);
  const ids = [...new Set(refs.filter((ref) => !isRefused(ref)).map((ref) => ref.id))];

  return {
    admitted: <TTable extends typeof ingredientCategories | typeof ingredientFolkNames>(
      table: TTable,
    ) => findManyOfIngredients(memberships, table, ids),
    answer: <T>(childrenOf: (id: string) => T) =>
      refs.map((ref) => (isRefused(ref) ? new Forbidden() : childrenOf(ref.id))),
  };
}

/** The proof for one coven, or `undefined` where the check refuses it. */
async function proofFor(
  session: Session | null,
  workspaceId: string,
): Promise<Membership | undefined> {
  if (!session) return undefined;
  try {
    return await assertMembership(session, workspaceId, { ingredient: ['read'] });
  } catch (error) {
    if (error instanceof Forbidden) return undefined;
    throw error;
  }
}

function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name);
}

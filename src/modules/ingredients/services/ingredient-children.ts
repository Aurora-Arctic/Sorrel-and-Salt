import 'server-only';
import {
  findManyByIds,
  findManyOfIngredients,
  findSubstitutesIncludingSoftDeleted,
} from '../../../db/repository';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { ingredientCategories } from '../schema/ingredient-categories';
import { ingredientFolkNames } from '../schema/ingredient-folk-names';
import { categories } from '@/modules/vocabulary/schema/categories';
import { type Membership, assertMembership } from '@/modules/coven';
import type { CategoryRow, IngredientKey, SubstituteRow } from '../types';

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
  refs: readonly IngredientKey[],
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
  refs: readonly IngredientKey[],
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
 * The live substitutes of each ingredient, as §7's `Substitute` reads them —
 * one answer per ref, sorted by the name each shows (DESIGN.md §5,
 * `ingredient_substitutes`). A link shows its ingredient's label and leads to
 * it; once that ingredient is deleted it shows the label it was deleted
 * under and leads nowhere. One read whatever the batch size, the linked
 * ingredients joined in, plus one role lookup per coven named; refused
 * exactly as `categoriesOf` refuses.
 */
export async function substitutesOf(
  session: Session | null,
  refs: readonly IngredientKey[],
): Promise<(SubstituteRow[] | Forbidden)[]> {
  const { memberships, ids, answer } = await admit(session, refs);
  const rows = await findSubstitutesIncludingSoftDeleted(memberships, ids);

  return answer((id) =>
    rows
      .filter(({ row }) => row.ingredientId === id)
      .map(({ row, joined: linked }) => ({
        // The CHECK holds a row to one of the two, so a typed row has its name.
        name: linked?.name ?? row.name ?? '',
        ingredient: linked?.deletedAt === null ? linked : null,
      }))
      .sort(byName),
  );
}

/**
 * The check the reads share: a proof for every coven the refs name that this
 * session may read, and a `Forbidden` for each that it may not. `admitted`
 * reads a child table for the refs that passed, whose `ids` and proofs a read
 * of its own takes; `answer` lays the result out in ref order.
 */
async function admit(session: Session | null, refs: readonly IngredientKey[]) {
  const covens = [...new Set(refs.flatMap((ref) => ref.workspaceId ?? []))];
  const proofs = await Promise.all(covens.map((workspaceId) => proofFor(session, workspaceId)));
  const refused = new Set(covens.filter((_, i) => !proofs[i]));
  const memberships = proofs.filter((proof): proof is Membership => proof !== undefined);

  const isRefused = (ref: IngredientKey) =>
    ref.workspaceId !== null && refused.has(ref.workspaceId);
  const ids = [...new Set(refs.filter((ref) => !isRefused(ref)).map((ref) => ref.id))];

  return {
    memberships,
    ids,
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

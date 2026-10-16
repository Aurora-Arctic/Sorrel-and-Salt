import 'server-only';
import {
  findDeitiesOfIngredients,
  findManyByIds,
  findManyOfIngredients,
  findManyOfVariants,
  findReferencesOf,
  findSubstitutesIncludingSoftDeleted,
} from '../../../db/repository';
import { byCitation, citationText } from '../../../lib/citation';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { proofFor } from './ingredient-rows';
import { ingredientCategories } from '../schema/ingredient-categories';
import { ingredientFolkNames } from '../schema/ingredient-folk-names';
import { ingredientVariants } from '../schema/ingredient-variants';
import { categories } from '@/modules/vocabulary/schema/categories';
import type { Membership } from '@/modules/coven';
import type {
  CategoryRow,
  CitedReference,
  IngredientDeityRow,
  IngredientKey,
  IngredientVariantRow,
  SubstituteRow,
  VariantKey,
} from '../types';

/**
 * The categories each ingredient is filed under, its own pairs and not its
 * forms' (MB.218), one answer per ref in the order given, each sorted by
 * name: a DataLoader's batch. Two reads whatever
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
  const filed = await filedUnder(await admitted(ingredientCategories));

  return answer((id) => filed((link) => link.ingredientId === id));
}

/**
 * The categories each variant adds to its ingredient (MB.218), as
 * `categoriesOf` reads an ingredient's: one answer per ref, sorted by name,
 * that form's own pairs and never its ingredient's, which the client shows
 * beside them (the union rule, MB.215). Two reads whatever the batch size,
 * plus one role lookup per coven named; refused exactly as `categoriesOf`
 * refuses.
 */
export async function categoriesOfVariants(
  session: Session | null,
  refs: readonly VariantKey[],
): Promise<(CategoryRow[] | Forbidden)[]> {
  const { memberships, ids, answer } = await admit(session, refs);
  const filed = await filedUnder(await findManyOfVariants(memberships, ingredientCategories, ids));

  return answer((id) => filed((link) => link.variantId === id));
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
  const rows = await findSubstitutesIncludingSoftDeleted(memberships, 'ingredient', ids);

  return answer((id) => substitutesShown(rows.filter(({ row }) => row.ingredientId === id)));
}

/**
 * What may stand in for each variant (MB.218), as `substitutesOf` reads an
 * ingredient's: one answer per ref, sorted by the name each shows, that
 * form's own rows and never its ingredient's. One read whatever the batch
 * size, plus one role lookup per coven named; refused exactly as
 * `categoriesOf` refuses.
 */
export async function substitutesOfVariants(
  session: Session | null,
  refs: readonly VariantKey[],
): Promise<(SubstituteRow[] | Forbidden)[]> {
  const { memberships, ids, answer } = await admit(session, refs);
  const rows = await findSubstitutesIncludingSoftDeleted(memberships, 'variant', ids);

  return answer((id) => substitutesShown(rows.filter(({ row }) => row.variantId === id)));
}

/**
 * The references each ingredient cites, as §7's `ReferenceLink` reads them —
 * one answer per ref, alphabetical by the rendered citation, which exists
 * only here, so the sort is the service's (DESIGN.md §5, "References read
 * alphabetically"). Only a live reference the ingredient's readers may read
 * is answered: the compendium's, or the ingredient's own coven's. One read
 * whatever the batch size, plus one role lookup per coven named; refused
 * exactly as `categoriesOf` refuses.
 */
export async function referencesOf(
  session: Session | null,
  refs: readonly IngredientKey[],
): Promise<(CitedReference[] | Forbidden)[]> {
  const { memberships, ids, answer } = await admit(session, refs);
  const cited = citedBy(await findReferencesOf(memberships, 'ingredientId', ids));

  return answer((id) => cited((link) => link.ingredientId === id));
}

/**
 * The references each variant cites (MB.218), as `referencesOf` reads an
 * ingredient's: one answer per ref, alphabetical by citation, that form's own
 * sources and never its ingredient's. One read whatever the batch size, plus
 * one role lookup per coven named; refused exactly as `categoriesOf` refuses.
 */
export async function referencesOfVariants(
  session: Session | null,
  refs: readonly VariantKey[],
): Promise<(CitedReference[] | Forbidden)[]> {
  const { memberships, ids, answer } = await admit(session, refs);
  const cited = citedBy(await findReferencesOf(memberships, 'ingredientVariantId', ids));

  return answer((id) => cited((link) => link.ingredientVariantId === id));
}

/**
 * The live deities of each ingredient, as `Ingredient.deities` reads them
 * (MB.167) — one answer per ref, in the order entered. A pick shows the name
 * its row holds and the curated deity behind it; once that deity or its
 * tradition is retired it shows the name alone, as a typed one does. One read
 * whatever the batch size, the curated deities joined in, plus one role
 * lookup per coven named; refused exactly as `categoriesOf` refuses.
 */
export async function deitiesOf(
  session: Session | null,
  refs: readonly IngredientKey[],
): Promise<(IngredientDeityRow[] | Forbidden)[]> {
  const { memberships, ids, answer } = await admit(session, refs);
  const rows = await findDeitiesOfIngredients(memberships, ids);

  return answer((id) =>
    rows
      .filter(({ row }) => row.ingredientId === id)
      .sort((a, b) => a.row.position - b.row.position)
      .map(({ row, joined: deity }) => ({ name: row.name, deity })),
  );
}

/**
 * The live forms of each ingredient, as `Ingredient.variants` reads them
 * (MB.218) — one answer per ref, sorted by form, case aside. Each carries the
 * ref's tier, which its own children's loaders ask a proof for. One read
 * whatever the batch size, plus one role lookup per coven named; refused
 * exactly as `categoriesOf` refuses.
 */
export async function variantsOf(
  session: Session | null,
  refs: readonly IngredientKey[],
): Promise<(IngredientVariantRow[] | Forbidden)[]> {
  const { admitted, answer } = await admit(session, refs);
  const rows = await admitted(ingredientVariants);

  return answer((id, { workspaceId }) =>
    rows
      .filter((row) => row.ingredientId === id)
      .sort(byForm)
      .map((row) => ({ ...row, workspaceId })),
  );
}

/**
 * The check the reads share, over ingredients or their variants alike: a
 * proof for every coven the refs name that this session may read, and a `Forbidden` for each that it may not. `admitted`
 * reads a child table for the refs that passed, whose `ids` and proofs a read
 * of its own takes; `answer` lays the result out in ref order.
 */
async function admit<K extends IngredientKey | VariantKey>(
  session: Session | null,
  refs: readonly K[],
) {
  const covens = [...new Set(refs.flatMap((ref) => ref.workspaceId ?? []))];
  const proofs = await Promise.all(covens.map((workspaceId) => proofFor(session, workspaceId)));
  const refused = new Set(covens.filter((_, i) => !proofs[i]));
  const memberships = proofs.filter((proof): proof is Membership => proof !== undefined);

  const isRefused = (ref: K) => ref.workspaceId !== null && refused.has(ref.workspaceId);
  const ids = [...new Set(refs.filter((ref) => !isRefused(ref)).map((ref) => ref.id))];

  return {
    memberships,
    ids,
    admitted: <
      TTable extends
        typeof ingredientCategories | typeof ingredientFolkNames | typeof ingredientVariants,
    >(
      table: TTable,
    ) => findManyOfIngredients(memberships, table, ids),
    answer: <T>(childrenOf: (id: string, ref: K) => T) =>
      refs.map((ref) => (isRefused(ref) ? new Forbidden() : childrenOf(ref.id, ref))),
  };
}

/**
 * The categories a batch's pairs file, as a lookup: given which pairs belong
 * to one parent, its categories, sorted by name. One read for the batch.
 */
async function filedUnder(
  links: readonly (typeof ingredientCategories.$inferSelect)[],
): Promise<(owns: (link: typeof ingredientCategories.$inferSelect) => boolean) => CategoryRow[]> {
  const rows = await findManyByIds(categories, [...new Set(links.map((link) => link.categoryId))]);
  const byId = new Map(rows.map((category) => [category.id, category]));
  return (owns) =>
    links
      .filter(owns)
      // A soft-deleted category is absent from `byId`, so its link renders nothing.
      .flatMap((link) => byId.get(link.categoryId) ?? [])
      .sort(byName);
}

/**
 * One parent's substitute rows as §7's `Substitute` reads them, sorted by
 * the name each shows. A link shows its ingredient's label and leads to it,
 * and to the form it names; once that ingredient is deleted it shows the label
 * it was deleted under and leads nowhere.
 */
function substitutesShown(
  rows: Awaited<ReturnType<typeof findSubstitutesIncludingSoftDeleted>>,
): SubstituteRow[] {
  return rows
    .map(({ row, joined: linked }) => {
      const ingredient = linked?.deletedAt === null ? linked : null;
      return {
        // The CHECK holds a row to one of the two, so a typed row has its name.
        name: linked?.name ?? row.name ?? '',
        ingredient,
        variantId: ingredient ? row.substituteVariantId : null,
      };
    })
    .sort(byName);
}

/**
 * A batch's reference links as a lookup: given which links belong to one
 * parent, its references with their locators, alphabetical by the rendered
 * citation, which exists only here, so the sort is the service's.
 */
function citedBy(
  rows: Awaited<ReturnType<typeof findReferencesOf>>,
): (owns: (link: (typeof rows)[number]['link']) => boolean) => CitedReference[] {
  const cited = rows.map(({ link, reference }) => ({
    link,
    citation: citationText(reference),
    reference,
  }));
  return (owns) =>
    cited
      .filter(({ link }) => owns(link))
      .sort((a, b) => byCitation(a.citation, b.citation))
      .map(({ link, reference }) => ({ reference, locator: link.locator }));
}

/** The proof for one coven, or `undefined` where the check refuses it. */
function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name);
}

/** By form, case aside, as the variant index folds a form (`lower(btrim(form))`). */
function byForm(a: { form: string }, b: { form: string }): number {
  return a.form.toLowerCase().localeCompare(b.form.toLowerCase());
}

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
  CardCategoryRow,
  CategoryRow,
  CitedReference,
  FolkNameRow,
  IngredientDeityRow,
  IngredientKey,
  IngredientVariantRow,
  SubstituteRow,
  VariantKey,
} from '../types';

/**
 * The categories each ingredient is filed under (its own pairs, not its forms'), sorted by name: a DataLoader batch. A compendium entry answers anyone,
 * a coven's its members; any other caller gets a `Forbidden` in that slot (claude-docs/db/ingredient-children.md, "Ingredient children").
 */
export async function categoriesOf(
  session: Session | null,
  refs: readonly IngredientKey[],
  heldBy?: Membership,
): Promise<(CategoryRow[] | Forbidden)[]> {
  const { admitted, answer } = await admit(session, refs, heldBy);
  const filed = await filedUnder(await admitted(ingredientCategories));

  return answer((id) => filed((link) => link.ingredientId === id));
}

/** The categories each variant adds to its ingredient: that form's own pairs, sorted by name, refused as `categoriesOf` refuses. */
export async function categoriesOfVariants(
  session: Session | null,
  refs: readonly VariantKey[],
  heldBy?: Membership,
): Promise<(CategoryRow[] | Forbidden)[]> {
  const { memberships, ids, answer } = await admit(session, refs, heldBy);
  const filed = await filedUnder(
    await findManyOfVariants(memberships, ingredientCategories, ids, heldBy),
  );

  return answer((id) => filed((link) => link.variantId === id));
}

/**
 * The categories a result card shows for each ingredient: its own, by name, then those only its live forms carry, by name, each with
 * the forms that carry it, by form. A category on both is its own. One batch for a page, refused as `categoriesOf` refuses.
 */
export async function cardCategoriesOf(
  session: Session | null,
  refs: readonly IngredientKey[],
  heldBy?: Membership,
): Promise<(CardCategoryRow[] | Forbidden)[]> {
  const { memberships, admitted, answer } = await admit(session, refs, heldBy);
  const [own, forms] = await Promise.all([
    admitted(ingredientCategories),
    admitted(ingredientVariants),
  ]);
  // Asked by the live forms' ids: a soft-deleted form's pairs outlive it, as the pair table is hard-deleted.
  const formPairs = await findManyOfVariants(
    memberships,
    ingredientCategories,
    forms.map(({ id }) => id),
    heldBy,
  );
  const filed = await filedUnder([...own, ...formPairs]);
  const formOf = new Map(forms.map((form) => [form.id, form]));

  return answer((id) => {
    const owned = filed((link) => link.ingredientId === id && link.variantId === null);
    const ownIds = new Set(owned.map((category) => category.id));
    const carriers = new Map<string, string[]>();
    for (const { variantId, categoryId } of formPairs) {
      const form = variantId ? formOf.get(variantId) : undefined;
      if (!form || form.ingredientId !== id || ownIds.has(categoryId)) continue;
      carriers.set(categoryId, [...(carriers.get(categoryId) ?? []), form.form]);
    }
    const formOnly = filed((link) => link.ingredientId === id && carriers.has(link.categoryId))
      // Two forms carrying one category file it twice; the card shows it once.
      .filter((category, at, list) => list.findIndex(({ id }) => id === category.id) === at);
    return [
      ...owned.map((category) => ({ category, forms: [] })),
      ...formOnly.map((category) => ({
        category,
        forms: (carriers.get(category.id) ?? []).sort((a, b) => byForm({ form: a }, { form: b })),
      })),
    ];
  });
}

/** The live folk names of each ingredient as §7's `FolkName` (id and text), sorted, refused as `categoriesOf` refuses. */
export async function folkNamesOf(
  session: Session | null,
  refs: readonly IngredientKey[],
  heldBy?: Membership,
): Promise<(FolkNameRow[] | Forbidden)[]> {
  const { admitted, answer } = await admit(session, refs, heldBy);
  const rows = await admitted(ingredientFolkNames);

  return answer((id) =>
    rows
      .filter((row) => row.ingredientId === id)
      .sort(byName)
      .map(({ id, name }) => ({ id, name })),
  );
}

/** The live substitutes of each ingredient as §7's `Substitute`, sorted by shown name; a link to a deleted ingredient shows its last label and leads nowhere. */
export async function substitutesOf(
  session: Session | null,
  refs: readonly IngredientKey[],
  heldBy?: Membership,
): Promise<(SubstituteRow[] | Forbidden)[]> {
  const { memberships, ids, answer } = await admit(session, refs, heldBy);
  const rows = await findSubstitutesIncludingSoftDeleted(memberships, 'ingredient', ids, heldBy);

  return answer((id) => substitutesShown(rows.filter(({ row }) => row.ingredientId === id)));
}

/** What may stand in for each variant: that form's own rows, sorted by shown name. */
export async function substitutesOfVariants(
  session: Session | null,
  refs: readonly VariantKey[],
  heldBy?: Membership,
): Promise<(SubstituteRow[] | Forbidden)[]> {
  const { memberships, ids, answer } = await admit(session, refs, heldBy);
  const rows = await findSubstitutesIncludingSoftDeleted(memberships, 'variant', ids, heldBy);

  return answer((id) => substitutesShown(rows.filter(({ row }) => row.variantId === id)));
}

/** The references each ingredient cites as §7's `ReferenceLink`, alphabetical by rendered citation (DESIGN.md §5, "References read alphabetically"), only those its readers may read. */
export async function referencesOf(
  session: Session | null,
  refs: readonly IngredientKey[],
  heldBy?: Membership,
): Promise<(CitedReference[] | Forbidden)[]> {
  const { memberships, ids, answer } = await admit(session, refs, heldBy);
  const cited = citedBy(await findReferencesOf(memberships, 'ingredientId', ids, heldBy));

  return answer((id) => cited((link) => link.ingredientId === id));
}

/** The references each variant cites: that form's own sources, alphabetical by citation. */
export async function referencesOfVariants(
  session: Session | null,
  refs: readonly VariantKey[],
  heldBy?: Membership,
): Promise<(CitedReference[] | Forbidden)[]> {
  const { memberships, ids, answer } = await admit(session, refs, heldBy);
  const cited = citedBy(await findReferencesOf(memberships, 'ingredientVariantId', ids, heldBy));

  return answer((id) => cited((link) => link.ingredientVariantId === id));
}

/** The live deities of each ingredient in the order entered; a retired deity or tradition shows the name alone. */
export async function deitiesOf(
  session: Session | null,
  refs: readonly IngredientKey[],
  heldBy?: Membership,
): Promise<(IngredientDeityRow[] | Forbidden)[]> {
  const { memberships, ids, answer } = await admit(session, refs, heldBy);
  const rows = await findDeitiesOfIngredients(memberships, ids, heldBy);

  return answer((id) =>
    rows
      .filter(({ row }) => row.ingredientId === id)
      .sort((a, b) => a.row.position - b.row.position)
      .map(({ row, joined: deity }) => ({ name: row.name, deity })),
  );
}

/** The live forms of each ingredient, sorted by form with case aside; each carries the ref's tier for its children's loaders. */
export async function variantsOf(
  session: Session | null,
  refs: readonly IngredientKey[],
  heldBy?: Membership,
): Promise<(IngredientVariantRow[] | Forbidden)[]> {
  const { admitted, answer } = await admit(session, refs, heldBy);
  const rows = await admitted(ingredientVariants);

  return answer((id, { workspaceId }) =>
    rows
      .filter((row) => row.ingredientId === id)
      .sort(byForm)
      .map((row) => ({ ...row, workspaceId })),
  );
}

/**
 * The check the reads share, over ingredients or variants: a proof for every coven the refs name that this session may read, a `Forbidden` for the rest.
 * `heldBy` is the reading coven's proof for a retired compendium entry its cupboard names.
 */
async function admit<K extends IngredientKey | VariantKey>(
  session: Session | null,
  refs: readonly K[],
  heldBy: Membership | undefined,
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
    ) => findManyOfIngredients(memberships, table, ids, heldBy),
    answer: <T>(childrenOf: (id: string, ref: K) => T) =>
      refs.map((ref) => (isRefused(ref) ? new Forbidden() : childrenOf(ref.id, ref))),
  };
}

/** The categories a batch's pairs file, as a lookup from one parent to its categories, sorted by name; one read for the batch. */
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

/** One parent's substitute rows as §7's `Substitute`, sorted by shown name; a link names the ingredient and form it leads to. */
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

/** A batch's reference links as a lookup from one parent to its references and locators, alphabetical by rendered citation. */
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

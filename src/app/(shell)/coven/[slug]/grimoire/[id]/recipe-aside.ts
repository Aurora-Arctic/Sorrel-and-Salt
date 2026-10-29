import 'server-only';
import { readCategories } from '@/app/compendium-reads';
import type { CardCategory } from '@/components/CategoryChips/types';
import type { SpellStepValue } from '@/components/SpellBuilder/steps/types';
import { jarOf } from '@/components/SpellBuilder/steps/values';
import type { SpellRecipeAsideProps } from '@/components/SpellRecipe/types';
import type { GroupColors } from '@/lib/types';
import type { Session } from '@/lib/session';
import type { SpellStepView } from '@/modules/grimoire';
import { categoriesOf, categoriesOfVariants, stockOf } from '@/modules/ingredients';

// What the recipe page's side column reads (M13.21; the owner, 2026-10-29): the spell's
// steps as the builder's Jar aside holds them, so In Coven Inventory and Category Match draw
// on the page exactly as they do while the spell is built. Each linked step's categories (its
// ingredient's, then its form's: the union rule, MB.215) and the coven's jar of its form come
// from the ingredients module's own batch reads, one call each whatever the spell's length,
// and never through GraphQL (CLAUDE.md rule 1). The Quick Look modal reads none of this: the
// column is the page's alone. Read per request and never cached (rule 6).

/** A step the service withheld, or one with nothing to read, holds no categories and no jar. */
const answered = <T>(answer: T | Error | undefined): T | undefined =>
  answer instanceof Error ? undefined : answer;

export async function readRecipeAsideOf(
  session: Session,
  workspaceId: string,
  views: readonly SpellStepView[],
  /** The categories the spell is assigned, as the recipe already read them. */
  intended: readonly CardCategory[],
): Promise<SpellRecipeAsideProps> {
  // Each ingredient and each form once, however many steps lay it.
  const ingredientRefs = [
    ...new Map(
      views.flatMap((v) => (v.ingredient ? [[v.ingredient.id, v.ingredient]] : [])),
    ).values(),
  ];
  const variantRefs = [
    ...new Map(views.flatMap((v) => (v.variant ? [[v.variant.id, v.variant]] : []))).values(),
  ];
  const [categories, formCategories, stock, known] = await Promise.all([
    ingredientRefs.length
      ? categoriesOf(
          session,
          ingredientRefs.map(({ id, workspaceId: tier }) => ({ id, workspaceId: tier })),
        )
      : [],
    variantRefs.length
      ? categoriesOfVariants(
          session,
          variantRefs.map(({ id, ingredientId, workspaceId: tier }) => ({
            id,
            ingredientId,
            workspaceId: tier,
          })),
        )
      : [],
    ingredientRefs.length
      ? stockOf(
          session,
          ingredientRefs.map(({ id }) => ({ ingredientId: id, workspaceId })),
        )
      : [],
    readCategories(),
  ]);
  const categoriesByIngredient = new Map(
    ingredientRefs.map(({ id }, i) => [id, answered(categories[i]) ?? []]),
  );
  const categoriesByVariant = new Map(
    variantRefs.map(({ id }, i) => [id, answered(formCategories[i]) ?? []]),
  );
  // The coven's jars of each ingredient, as `jarOf` reads them from the builder's query: a
  // jar's amounts are numeric strings in the row and numbers on the screen.
  const jarsByIngredient = new Map(
    ingredientRefs.map(({ id }, i) => [
      id,
      (answered(stock[i]) ?? []).map((jar) => ({
        unit: jar.unit,
        quantityOnHand: jar.quantityOnHand === null ? null : Number(jar.quantityOnHand),
        lowStockThreshold: jar.lowStockThreshold === null ? null : Number(jar.lowStockThreshold),
        variant: { id: jar.variantId },
      })),
    ]),
  );
  const named = ({ id, name }: { id: string; name: string }) => ({ id, name });

  const steps = views.map((view): SpellStepValue => {
    const { ingredient, variant } = view;
    const jars = ingredient ? (jarsByIngredient.get(ingredient.id) ?? []) : [];
    const jar = ingredient && variant ? jarOf(jars, variant.id) : null;
    return {
      stepId: view.id,
      ingredientId: ingredient?.id ?? null,
      variantId: variant?.id ?? null,
      name: ingredient ? ingredient.name : view.name,
      form: ingredient ? (variant?.form ?? null) : view.form,
      quantity: view.quantity === null ? '' : String(view.quantity),
      unit: view.unit ?? '',
      savedUnit: view.unit,
      body: view.body,
      // The form's group icon is not read: the column draws no icon, only the jar's shape.
      icon: null,
      categories: ingredient
        ? [
            ...(categoriesByIngredient.get(ingredient.id) ?? []).map(named),
            ...(variant ? (categoriesByVariant.get(variant.id) ?? []).map(named) : []),
          ]
        : [],
      // The page's steps carry their own Toxic and Caution marks; the column draws none.
      safety: null,
      jarUnit: jar?.unit ?? null,
      jar,
    };
  });

  return {
    steps,
    intended: intended.map(({ category }) => named(category)),
    groups: known.map(({ id, group }): [string, GroupColors] => [
      id,
      { colorDark: group.colorDark, colorLight: group.colorLight },
    ]),
  };
}

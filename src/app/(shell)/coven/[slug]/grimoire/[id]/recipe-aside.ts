import 'server-only';
import type { Route } from 'next';
import { readCategories } from '@/app/compendium-reads';
import { stockDialogOf } from '@/app/coven-stock';
import type { CardCategory } from '@/components/CategoryChips/types';
import type { SpellStepValue } from '@/components/SpellBuilder/steps/types';
import { jarOf } from '@/components/SpellBuilder/steps/values';
import type { InventoryDoor, SpellRecipeAsideProps } from '@/components/SpellRecipe/types';
import type { GroupColors } from '@/lib/types';
import type { Session } from '@/lib/session';
import type { SpellStepView } from '@/modules/grimoire';
import { categoriesOf, categoriesOfVariants, stockOf, variantsOf } from '@/modules/ingredients';
import { entryHrefOf } from './recipe-steps';
import { jarRowsOf } from './recipe-supply';

// What the recipe page's side column reads: each linked step's categories and the coven's jar of its
// form, from the ingredients module's batch reads, never GraphQL (rule 1). Forms are read only for a
// role that may update stock. Per request, never cached (rule 6).

const answered = <T>(answer: T | Error | undefined): T | undefined =>
  answer instanceof Error ? undefined : answer;

export async function readRecipeAsideOf(
  session: Session,
  workspaceId: string,
  views: readonly SpellStepView[],
  intended: readonly CardCategory[],
  hereHref: Route,
  mayStock: boolean,
): Promise<SpellRecipeAsideProps> {
  const ingredientRefs = [
    ...new Map(
      views.flatMap((v) => (v.ingredient ? [[v.ingredient.id, v.ingredient]] : [])),
    ).values(),
  ];
  const variantRefs = [
    ...new Map(views.flatMap((v) => (v.variant ? [[v.variant.id, v.variant]] : []))).values(),
  ];
  const [categories, formCategories, stock, known, forms] = await Promise.all([
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
    mayStock && ingredientRefs.length
      ? variantsOf(
          session,
          ingredientRefs.map(({ id, workspaceId: tier }) => ({ id, workspaceId: tier })),
        )
      : [],
  ]);
  const categoriesByIngredient = new Map(
    ingredientRefs.map(({ id }, i) => [id, answered(categories[i]) ?? []]),
  );
  const categoriesByVariant = new Map(
    variantRefs.map(({ id }, i) => [id, answered(formCategories[i]) ?? []]),
  );
  const jarsByIngredient = new Map(ingredientRefs.map(({ id }, i) => [id, jarRowsOf(stock[i])]));
  const named = ({ id, name }: { id: string; name: string }) => ({ id, name });
  const formsByIngredient = new Map(
    // Unread for a role that may not update stock, and withheld by the service for an ingredient
    // it refuses: either way the line gets no Edit Stock.
    ingredientRefs.map(({ id }, i) => [id, answered(forms[i])]),
  );
  const stockByIngredient = new Map(
    ingredientRefs.map(({ id }, i) => [id, answered(stock[i]) ?? []]),
  );

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
      // The row's numeric is a string with its scale ("1.000"); the builder holds the number's own text.
      quantity: view.quantity === null ? '' : String(Number(view.quantity)),
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

  const doors = views.flatMap((view): InventoryDoor[] => {
    const { ingredient, variant } = view;
    if (!ingredient) return [];
    const gone = ingredient.deleted || variant?.deleted === true;
    const forms = formsByIngredient.get(ingredient.id);
    return [
      {
        stepId: view.id,
        look: gone
          ? null
          : {
              href: entryHrefOf(hereHref, ingredient.id),
              name: ingredient.name,
              canonicalName: ingredient.canonicalName,
              nomenclature: ingredient.nomenclature,
            },
        stock:
          gone || !forms
            ? null
            : {
                workspaceId,
                ingredientId: ingredient.id,
                ingredientName: ingredient.name,
                ...stockDialogOf(forms, stockByIngredient.get(ingredient.id) ?? []),
                ...(variant && { openOn: variant.id }),
              },
      },
    ];
  });

  return {
    steps,
    doors,
    intended: intended.map(({ category }) => named(category)),
    groups: known.map(({ id, group }): [string, GroupColors] => [
      id,
      { colorDark: group.colorDark, colorLight: group.colorLight },
    ]),
  };
}

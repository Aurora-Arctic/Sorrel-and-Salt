import 'server-only';
import type {
  IngredientFormValues,
  ReferenceListEntry,
  SubstituteForm,
  SubstituteListEntry,
} from '@/components/IngredientForm/types';
import { EMPTY_VALUES, EMPTY_VARIANT } from '@/components/IngredientForm/values';
import { citationText } from '@/lib/citation';
import {
  type CitedReference,
  type IngredientRow,
  type SubstituteRow,
  categoriesOf,
  categoriesOfVariants,
  deitiesOf,
  folkNamesOf,
  referencesOf,
  referencesOfVariants,
  substitutesOf,
  substitutesOfVariants,
  variantsOf,
} from '@/modules/ingredients';
import { deityTraditionsOf, formChoicesOf, formGroupsOf } from '@/modules/vocabulary';

// A compendium entry as the form edits it: every value and link the form
// shows, read on the navigation through the services the GraphQL `Ingredient`
// resolves through, so the page needs no browser read to open the modal
// (CLAUDE.md rule 1). Each read is a loader's batch of one, with no session:
// a compendium entry answers anyone (MB.80).

/** A batch answer for one ref, which a compendium ref is never refused. */
function only<T>([answer]: readonly (T | Error)[]): T {
  if (answer === undefined || answer instanceof Error) throw answer ?? new Error('No answer');
  return answer;
}

/** The name of a group or tradition, or null once it is gone. */
const nameOf = (group: { name: string } | Error | undefined): string | null =>
  group === undefined || group instanceof Error ? null : group.name;

/**
 * A substitute as a list entry: its label, and the ingredient and the form of
 * it a link names, with the forms that ingredient comes in, which its second
 * picker offers (MB.215).
 */
const substituteEntry =
  (formsOf: ReadonlyMap<string, SubstituteForm[]>) =>
  ({ name, ingredient, variantId }: SubstituteRow): SubstituteListEntry =>
    ingredient
      ? {
          value: name,
          link: {
            id: ingredient.id,
            canonicalName: ingredient.canonicalName,
            forms: (formsOf.get(ingredient.id) ?? []).map((variant) => variant.form),
            description: ingredient.description,
            isGlobal: ingredient.workspaceId === null,
            variants: formsOf.get(ingredient.id),
          },
          ...(variantId ? { variantId } : {}),
        }
      : { value: name };

/** A reference as its row: the citation, the source it links, and its locator. */
const referenceEntry = ({ reference, locator }: CitedReference): ReferenceListEntry => ({
  value: citationText(reference),
  link: { id: reference.id, isGlobal: reference.workspaceId === null },
  locator: locator ?? '',
});

const entries = (values: readonly string[] | null) => (values ?? []).map((value) => ({ value }));

export async function entryValues(entry: IngredientRow): Promise<IngredientFormValues> {
  const refs = [{ id: entry.id, workspaceId: null }];
  const [folkNames, categories, substitutes, deities, references, variants] = await Promise.all([
    folkNamesOf(null, refs).then(only),
    categoriesOf(null, refs).then(only),
    substitutesOf(null, refs).then(only),
    deitiesOf(null, refs).then(only),
    referencesOf(null, refs).then(only),
    variantsOf(null, refs).then(only),
  ]);
  // Each form's own children, a batch over the forms (MB.218).
  const variantRefs = variants.map(({ id, ingredientId }) => ({
    id,
    ingredientId,
    workspaceId: null,
  }));
  const picked = deities.flatMap(({ deity }) => deity ?? []);
  const [traditions, forms, variantCategories, variantSubstitutes, variantReferences] =
    await Promise.all([
      deityTraditionsOf(picked.map((deity) => deity.traditionId)),
      formChoicesOf(variants.flatMap(({ formId }) => formId ?? [])),
      categoriesOfVariants(null, variantRefs),
      substitutesOfVariants(null, variantRefs),
      referencesOfVariants(null, variantRefs),
    ]);
  const live = forms.flatMap((form) => form ?? []);
  // The forms of every ingredient a substitute links, the entry's and its forms'.
  const linked = [
    ...substitutes,
    ...variantSubstitutes.flatMap((answer) => only([answer])),
  ].flatMap(({ ingredient }) => ingredient ?? []);
  const [groups, linkedForms] = await Promise.all([
    formGroupsOf(live.map((form) => form.groupId)),
    variantsOf(null, linked),
  ]);
  // Its group only ranks a lookup's rows, so a link read here carries none.
  const formsOfLinked = new Map(
    linked.map(({ id }, i) => [
      id,
      only([linkedForms[i]]).map((row) => ({ id: row.id, form: row.form, group: null })),
    ]),
  );
  const toSubstitute = substituteEntry(formsOfLinked);
  const formOf = new Map(live.map((form, i) => [form.id, { form, group: nameOf(groups[i]) }]));
  const traditionOf = new Map(picked.map((deity, i) => [deity.id, nameOf(traditions[i])]));

  return {
    ...EMPTY_VALUES,
    name: entry.name,
    nomenclature: entry.nomenclature,
    canonicalName: entry.canonicalName ?? '',
    variants: variants.map((variant, i) => {
      // A pick whose form has since been retired reads as its text, and one
      // whose group has, without its group, as `IngredientVariant.formChoice` does.
      const choice = variant.formId ? formOf.get(variant.formId) : undefined;
      return {
        ...EMPTY_VARIANT,
        variantId: variant.id,
        form: variant.form,
        formLink: choice
          ? {
              id: choice.form.id,
              name: choice.form.name,
              group: choice.group,
              description: choice.form.description,
            }
          : null,
        description: variant.description ?? '',
        safetyNotes: variant.safetyNotes ?? '',
        elements: variant.elements ?? [],
        planets: entries(variant.planets),
        zodiacSigns: entries(variant.zodiacSigns),
        colors: entries(variant.colors),
        categoryIds: only([variantCategories[i]]).map((category) => category.id),
        substitutes: only([variantSubstitutes[i]]).map(toSubstitute),
        references: only([variantReferences[i]]).map(referenceEntry),
      };
    }),
    folkNames: folkNames.map((value) => ({ value })),
    description: entry.description ?? '',
    elements: entry.elements ?? [],
    planets: entries(entry.planets),
    zodiacSigns: entries(entry.zodiacSigns),
    colors: entries(entry.colors),
    deities: deities.map(({ name, deity }) =>
      deity
        ? {
            value: name,
            link: {
              id: deity.id,
              tradition: traditionOf.get(deity.id) ?? null,
              description: deity.description,
            },
          }
        : { value: name },
    ),
    substitutes: substitutes.map(toSubstitute),
    safetyNotes: entry.safetyNotes ?? '',
    references: references.map(referenceEntry),
    categoryIds: categories.map((category) => category.id),
  };
}

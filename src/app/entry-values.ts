import 'server-only';
import type {
  IngredientFormValues,
  ReferenceListEntry,
  SubstituteForm,
  SubstituteListEntry,
} from '@/components/IngredientForm/types';
import { EMPTY_VALUES, EMPTY_VARIANT } from '@/components/IngredientForm/values';
import { citationText } from '@/lib/citation';
import type { Session } from '@/lib/session';
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
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';

// An entry as the form edits it: every value and link the form shows, read on the navigation through
// the services the GraphQL `Ingredient` resolves through, so the page needs no browser read to open
// the modal (CLAUDE.md rule 1). Each read is a loader's batch of one. A compendium entry answers
// anyone, so its pages pass no session; a coven's own entry answers only its members, each service
// checking the coven's proof.

/** A batch answer for one ref. A compendium ref is never refused; a coven's is refused, by throwing, to anyone but its members. */
function only<T>([answer]: readonly (T | Error)[]): T {
  if (answer === undefined || answer instanceof Error) throw answer ?? new Error('No answer');
  return answer;
}

/** The name of a group or tradition, or null once it is gone. */
/** The icon of a form group, or null once it is gone or carries none. */
const iconOf = (group: { icon: FormGroupIcon | null } | Error | undefined): FormGroupIcon | null =>
  group === undefined || group instanceof Error ? null : group.icon;

const nameOf = (group: { name: string } | Error | undefined): string | null =>
  group === undefined || group instanceof Error ? null : group.name;

/**
 * A substitute as a list entry: its label, and the ingredient and the form of it a link names, with
 * the forms that ingredient comes in, which its second picker offers.
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

/** A reference as its row: the citation, the source it links with the fields its short form is made of, and its locator. */
const referenceEntry = ({ reference, locator }: CitedReference): ReferenceListEntry => ({
  value: citationText(reference),
  link: {
    id: reference.id,
    isGlobal: reference.workspaceId === null,
    kind: reference.kind,
    title: reference.title,
    authors: reference.authors,
    container: reference.container,
  },
  locator: locator ?? '',
});

const entries = (values: readonly string[] | null) => (values ?? []).map((value) => ({ value }));

export async function entryValues(
  entry: IngredientRow,
  session: Session | null,
): Promise<IngredientFormValues> {
  const refs = [{ id: entry.id, workspaceId: entry.workspaceId }];
  const [folkNames, categories, substitutes, deities, references, variants] = await Promise.all([
    folkNamesOf(session, refs).then(only),
    categoriesOf(session, refs).then(only),
    substitutesOf(session, refs).then(only),
    deitiesOf(session, refs).then(only),
    referencesOf(session, refs).then(only),
    variantsOf(session, refs).then(only),
  ]);
  // Each form's own children, a batch over the forms.
  const variantRefs = variants.map(({ id, ingredientId }) => ({
    id,
    ingredientId,
    workspaceId: entry.workspaceId,
  }));
  const picked = deities.flatMap(({ deity }) => deity ?? []);
  const [traditions, forms, variantCategories, variantSubstitutes, variantReferences] =
    await Promise.all([
      deityTraditionsOf(picked.map((deity) => deity.traditionId)),
      formChoicesOf(variants.flatMap(({ formId }) => formId ?? [])),
      categoriesOfVariants(session, variantRefs),
      substitutesOfVariants(session, variantRefs),
      referencesOfVariants(session, variantRefs),
    ]);
  const live = forms.flatMap((form) => form ?? []);
  // The forms of every ingredient a substitute links, the entry's and its forms'.
  const linked = [
    ...substitutes,
    ...variantSubstitutes.flatMap((answer) => only([answer])),
  ].flatMap(({ ingredient }) => ingredient ?? []);
  const [groups, linkedForms] = await Promise.all([
    formGroupsOf(live.map((form) => form.groupId)),
    variantsOf(session, linked),
  ]);
  // Its group only ranks a lookup's rows, so a link read here carries none.
  const formsOfLinked = new Map(
    linked.map(({ id }, i) => [
      id,
      only([linkedForms[i]]).map((row) => ({ id: row.id, form: row.form, group: null })),
    ]),
  );
  const toSubstitute = substituteEntry(formsOfLinked);
  const formOf = new Map(
    live.map((form, i) => [form.id, { form, group: nameOf(groups[i]), icon: iconOf(groups[i]) }]),
  );
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
              icon: choice.icon,
              description: choice.form.description,
            }
          : null,
        description: variant.description ?? '',
        safetyNotes: variant.safetyNotes ?? '',
        toxic: variant.toxic,
        elements: variant.elements ?? [],
        celestialBodies: entries(variant.celestialBodies),
        zodiacSigns: entries(variant.zodiacSigns),
        colors: entries(variant.colors),
        categoryIds: only([variantCategories[i]]).map((category) => category.id),
        substitutes: only([variantSubstitutes[i]]).map(toSubstitute),
        references: only([variantReferences[i]]).map(referenceEntry),
      };
    }),
    folkNames: folkNames.map(({ id, name }) => ({ value: name, id })),
    description: entry.description ?? '',
    elements: entry.elements ?? [],
    celestialBodies: entries(entry.celestialBodies),
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
    toxic: entry.toxic,
    references: references.map(referenceEntry),
    categoryIds: categories.map((category) => category.id),
  };
}

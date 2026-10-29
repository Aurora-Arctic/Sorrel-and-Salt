import { builder } from '../../../graphql/builder';
import type { SchemaTypes } from '../../../graphql/types';
import { IngredientElementEnum, NomenclatureEnum } from './ingredient';
import { ReferenceLinkInput } from './references';
import type { Tier } from '../types';

// The fields of the ingredient's four input types — a coven's and the
// compendium's, each a create and a whole-row update — declared once, so the
// two tiers' writes cannot take different fields. A child table is one
// field here, as `variants` is. The types themselves stay beside their mutations.

/**
 * One substitute: an ingredient to link, or the name of one not entered —
 * exactly one, which the shared schema holds rather than the type, as GraphQL
 * has no one-of input here (DESIGN.md §5, `ingredient_substitutes`).
 */
const SubstituteInput = builder.inputType('SubstituteInput', {
  description: 'An ingredient to link, or the name of one not entered: exactly one of the two.',
  fields: (t) => ({
    ingredientId: t.id(),
    substituteVariantId: t.id({
      description: "One of the linked ingredient's forms, when the substitute is that form alone.",
    }),
    name: t.string(),
  }),
});

/**
 * One deity: the curated one picked, or a name typed — exactly one, held by
 * the shared schema as `SubstituteInput` is (DESIGN.md §5, `ingredient_deities`).
 */
const IngredientDeityInput = builder.inputType('IngredientDeityInput', {
  description: 'A curated deity picked, or a name typed: exactly one of the two.',
  fields: (t) => ({
    deityId: t.id(),
    name: t.string(),
  }),
});

/**
 * One form of the ingredient, and what it adds (DESIGN.md §5,
 * `ingredient_variants`): written inside the ingredient's own save,
 * never by a mutation of its own. Every field but `id` is non-null, since an
 * entry replaces the form it names in a create and an update alike, so
 * leaving one out is a schema error rather than a silent clear.
 */
const IngredientVariantInput = builder.inputType('IngredientVariantInput', {
  description:
    'One form of the ingredient, replacing the form it names. Every field but id is sent, and "" or [] clears one.',
  fields: (t) => ({
    id: t.id({
      description:
        'The form this entry keeps, so its text can be respelt; without one, the form whose text folds alike is kept, or a new one added.',
    }),
    form: t.string({ required: true }),
    formId: t.id({
      required: true,
      description: 'The curated form picked for `form`; "" when it was typed.',
    }),
    description: t.string({ required: true }),
    safetyNotes: t.string({ required: true }),
    toxic: t.boolean({
      required: true,
      description: "Whether this form is toxic: its own flag, whatever the ingredient's says.",
    }),
    elements: t.field({ type: [IngredientElementEnum], required: true }),
    celestialBodies: t.stringList({ required: true }),
    zodiacSigns: t.stringList({ required: true }),
    colors: t.stringList({ required: true }),
    categoryIds: t.idList({
      required: true,
      description: 'The categories this form is filed under.',
    }),
    substitutes: t.field({ type: [SubstituteInput], required: true }),
    references: t.field({ type: [ReferenceLinkInput], required: true }),
  }),
});

/**
 * An ingredient input type's fields. The two switches are the two ways the
 * four types differ: `whole` is an update's, which replaces the row, so every
 * field is non-null and leaving one out is a schema error rather than a
 * silent clear; and `tier`, since the compendium declares a
 * `nomenclature` for every entry (DESIGN.md §5), where a coven's create may
 * leave it out. Only `name` and `variants` are required otherwise, so story
 * 29's stub saves with `variants: []`.
 */
export function ingredientInputFields<T extends Tier, Whole extends boolean>(
  t: PothosSchemaTypes.InputFieldBuilder<
    PothosSchemaTypes.ExtendDefaultTypes<SchemaTypes>,
    'InputObject'
  >,
  { tier, whole }: { tier: T; whole: Whole },
) {
  // Spelled as a type too, so each input type's TypeScript shape keeps the
  // field non-null where the SDL does.
  const nomenclatureRequired = (tier === 'compendium' || whole) as T extends 'compendium'
    ? true
    : Whole;
  return {
    name: t.string({ required: true }),
    canonicalName: t.string({ required: whole }),
    nomenclature: t.field({ type: NomenclatureEnum, required: nomenclatureRequired }),
    description: t.string({ required: whole }),
    elements: t.field({ type: [IngredientElementEnum], required: whole }),
    celestialBodies: t.stringList({ required: whole }),
    zodiacSigns: t.stringList({ required: whole }),
    deities: t.field({ type: [IngredientDeityInput], required: whole }),
    colors: t.stringList({ required: whole }),
    safetyNotes: t.string({ required: whole }),
    toxic: t.boolean({
      required: whole,
      description: whole
        ? "Whether the ingredient is toxic; each form's flag is its own."
        : "Whether the ingredient is toxic, off when left out; each form's flag is its own.",
    }),
    substitutes: t.field({ type: [SubstituteInput], required: whole }),
    references: t.field({ type: [ReferenceLinkInput], required: whole }),
    folkNames: t.stringList({ required: whole }),
    categoryIds: t.idList({
      required: whole,
      description: whole
        ? 'The categories it is filed under; [] when none.'
        : 'The categories it is filed under.',
    }),
    // Required on every type, a create's included: the only place
    // a form is written, so a caller always says which it has, [] for none.
    variants: t.field({
      type: [IngredientVariantInput],
      required: true,
      description:
        'Its forms, each replacing the one it names; a form not listed is removed, and [] is none.',
    }),
  };
}

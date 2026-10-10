import { builder } from '../../../graphql/builder';
import type { SchemaTypes } from '../../../graphql/types';
import { IngredientElementEnum, NomenclatureEnum } from './ingredient';
import { ReferenceLinkInput } from './references';
import type { Tier } from '../types';

// The fields of the ingredient's four input types — a coven's and the
// compendium's, each a create and a whole-row update — declared once, so the
// two tiers' writes cannot take different fields. A sixth child table is one
// field here. The types themselves stay beside their mutations.

/**
 * One substitute: an ingredient to link, or the name of one not entered —
 * exactly one, which the shared schema holds rather than the type, as GraphQL
 * has no one-of input here (DESIGN.md §5, `ingredient_substitutes`).
 */
const SubstituteInput = builder.inputType('SubstituteInput', {
  description: 'An ingredient to link, or the name of one not entered: exactly one of the two.',
  fields: (t) => ({
    ingredientId: t.id(),
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

/** What `formId` says it is, by tier and by whether the type is the whole row. */
const FORM_ID = {
  compendium: {
    part: 'The curated form picked for `form`.',
    whole: 'The curated form picked for `form`; "" when there is none.',
  },
  coven: {
    part: 'The curated form picked for `form`; none when it was typed.',
    whole: 'The curated form picked for `form`; "" when it was typed.',
  },
} as const;

/**
 * An ingredient input type's fields. The two switches are the two ways the
 * four types differ: `whole` is an update's, which replaces the row, so every
 * field is non-null and leaving one out is a schema error rather than a
 * silent clear (MB.159); and `tier`, since the compendium declares a
 * `nomenclature` for every entry (DESIGN.md §5), where a coven's create may
 * leave it out. Only `name` is required otherwise, so story 29's stub saves.
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
    form: t.string({ required: whole }),
    formId: t.id({ required: whole, description: FORM_ID[tier][whole ? 'whole' : 'part'] }),
    description: t.string({ required: whole }),
    elements: t.field({ type: [IngredientElementEnum], required: whole }),
    planets: t.stringList({ required: whole }),
    zodiacSigns: t.stringList({ required: whole }),
    deities: t.field({ type: [IngredientDeityInput], required: whole }),
    colors: t.stringList({ required: whole }),
    safetyNotes: t.string({ required: whole }),
    substitutes: t.field({ type: [SubstituteInput], required: whole }),
    references: t.field({ type: [ReferenceLinkInput], required: whole }),
    folkNames: t.stringList({ required: whole }),
    categoryIds: t.idList({
      required: whole,
      description: whole
        ? 'The categories it is filed under; [] when none.'
        : 'The categories it is filed under.',
    }),
  };
}

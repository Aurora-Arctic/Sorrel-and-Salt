import { builder } from '../../../graphql/builder';
import { AuditInfo } from '../../../graphql/schema/audit';
import { INGREDIENT_ELEMENTS, NOMENCLATURE_KINDS } from '../schema/ingredient-enums';
import { ReferenceLinkRef } from './references';
import { CategoryRef, DeityRef, IngredientFormValueRef } from '@/modules/vocabulary';
import type {
  IngredientDeityRow,
  IngredientRow,
  IngredientVariantRow,
  SubstituteRow,
} from '../types';

// `Ingredient` as DESIGN.md §7 sketches it, over the row the services return:
// every correspondence field, the tier as `isGlobal`, and the six children
// and the picked form through the request's loaders. `identityKey`,
// `workspaceId` and `formId` stay off the wire: the key is the database's
// own, the tier is a flag, and the pick is `formChoice`.

export const NomenclatureEnum = builder.enumType('Nomenclature', { values: NOMENCLATURE_KINDS });
export const IngredientElementEnum = builder.enumType('IngredientElement', {
  values: INGREDIENT_ELEMENTS,
});

// Declared before any is implemented, since the types below name one another.
export const IngredientRef = builder.objectRef<IngredientRow>('Ingredient');
export const IngredientVariantRef = builder.objectRef<IngredientVariantRow>('IngredientVariant');

/**
 * A link or a typed name (DESIGN.md §7, MB.138). No `audit`, as `folkNames`
 * carries none.
 */
export const SubstituteRef = builder.objectRef<SubstituteRow>('Substitute').implement({
  description:
    'Another ingredient to use in its place: a link to one, or the name of one not entered.',
  fields: (t) => ({
    name: t.exposeString('name', {
      description:
        "The linked ingredient's label, its last once deleted; the typed name otherwise.",
    }),
    ingredient: t.field({
      type: IngredientRef,
      nullable: true,
      description:
        'The ingredient to follow: null on a typed name, and once the linked ingredient is deleted.',
      resolve: (substitute) => substitute.ingredient,
    }),
    // Read beneath the linked ingredient, through the loader its variants are
    // read by, never by the variant's id alone (MB.218): a form takes its
    // ingredient's tier, so a link the reader may not follow shows no form.
    variant: t.field({
      type: IngredientVariantRef,
      nullable: true,
      description:
        "The linked ingredient's form the link names: null when it names none, on a typed name, and once that ingredient or form is deleted.",
      resolve: async (substitute, _args, { loaders }) => {
        const { ingredient, variantId } = substitute;
        if (!ingredient || !variantId) return null;
        const variants = await loaders.variantsByIngredient.load(ingredient);
        return variants.find((variant) => variant.id === variantId) ?? null;
      },
    }),
  }),
});

/**
 * A deity picked or typed (DESIGN.md §7, MB.167). No `audit`, as `folkNames`
 * carries none.
 */
export const IngredientDeityRef = builder
  .objectRef<IngredientDeityRow>('IngredientDeity')
  .implement({
    description:
      'A deity the ingredient corresponds to: one picked from the curated list, or typed.',
    fields: (t) => ({
      name: t.exposeString('name', {
        description: "The name as saved: a picked deity's curated spelling, or the typed text.",
      }),
      deity: t.field({
        type: DeityRef,
        nullable: true,
        description:
          'The curated deity picked: null on a typed name, and once that deity or its tradition is retired.',
        resolve: (deity) => deity.deity,
      }),
    }),
  });

/**
 * One form of an ingredient (DESIGN.md §7, MB.215): what it adds to its
 * ingredient, never what it overrides, so a client shows both. `ingredientId`
 * and `workspaceId` stay off the wire: a variant is read beneath its
 * ingredient, whose tier it takes.
 */
IngredientVariantRef.implement({
  description:
    "One form an ingredient comes in, and what that form adds to the ingredient: its lists add to the ingredient's, and nothing overrides it.",
  fields: (t) => ({
    id: t.exposeID('id'),
    form: t.exposeString('form'),
    formChoice: t.field({
      type: IngredientFormValueRef,
      nullable: true,
      description:
        'The curated form picked for `form`: null when the form was typed, and once that form or its group is retired.',
      resolve: (row, _args, { loaders }) =>
        row.formId === null ? null : loaders.ingredientFormsById.load(row.formId),
    }),
    description: t.exposeString('description', { nullable: true }),
    safetyNotes: t.exposeString('safetyNotes', { nullable: true }),
    elements: t.expose('elements', { type: [IngredientElementEnum], nullable: true }),
    planets: t.exposeStringList('planets', { nullable: true }),
    zodiacSigns: t.exposeStringList('zodiacSigns', { nullable: true }),
    colors: t.exposeStringList('colors', { nullable: true }),
    // This form's own additions, never its ingredient's, which the client
    // shows beside them (the union rule). The row is the loaders' key, as an
    // ingredient's is theirs.
    categories: t.field({
      type: [CategoryRef],
      resolve: (row, _args, { loaders }) => loaders.categoriesByVariant.load(row),
    }),
    // Alphabetical by the name each shows, `[]` when there are none.
    substitutes: t.field({
      type: [SubstituteRef],
      resolve: (row, _args, { loaders }) => loaders.substitutesByVariant.load(row),
    }),
    // Alphabetical by citation, `[]` when there are none.
    references: t.field({
      type: [ReferenceLinkRef],
      resolve: (row, _args, { loaders }) => loaders.referencesByVariant.load(row),
    }),
    audit: t.field({ type: AuditInfo, resolve: (row) => row }),
  }),
});

IngredientRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    slug: t.exposeString('slug'),
    canonicalName: t.exposeString('canonicalName', {
      nullable: true,
      description: 'The formal name: null for none, set for a named kind, either for unknown.',
    }),
    nomenclature: t.expose('nomenclature', { type: NomenclatureEnum }),
    form: t.exposeString('form', { nullable: true }),
    formChoice: t.field({
      type: IngredientFormValueRef,
      nullable: true,
      description:
        'The curated form picked for `form`: null when the form was typed, and once that form or its group is retired.',
      resolve: (row, _args, { loaders }) =>
        row.formId === null ? null : loaders.ingredientFormsById.load(row.formId),
    }),
    description: t.exposeString('description', { nullable: true }),
    elements: t.expose('elements', { type: [IngredientElementEnum], nullable: true }),
    planets: t.exposeStringList('planets', { nullable: true }),
    zodiacSigns: t.exposeStringList('zodiacSigns', { nullable: true }),
    colors: t.exposeStringList('colors', { nullable: true }),
    safetyNotes: t.exposeString('safetyNotes', { nullable: true }),
    isGlobal: t.boolean({ resolve: (row) => row.workspaceId === null }),
    // The row is the loaders' key: they read `workspaceId` off it to know
    // which coven to check, and cache by `id`.
    folkNames: t.stringList({
      resolve: (row, _args, { loaders }) => loaders.folkNamesByIngredient.load(row),
    }),
    categories: t.field({
      type: [CategoryRef],
      resolve: (row, _args, { loaders }) => loaders.categoriesByIngredient.load(row),
    }),
    // Alphabetical by the name each shows, `[]` when there are none.
    substitutes: t.field({
      type: [SubstituteRef],
      resolve: (row, _args, { loaders }) => loaders.substitutesByIngredient.load(row),
    }),
    // In the order entered, `[]` when there are none (MB.165).
    deities: t.field({
      type: [IngredientDeityRef],
      resolve: (row, _args, { loaders }) => loaders.deitiesByIngredient.load(row),
    }),
    // By form, case aside, `[]` for an entry that is information only (MB.218).
    // A bare list, bounded by its parent, as every child list here is.
    variants: t.field({
      type: [IngredientVariantRef],
      resolve: (row, _args, { loaders }) => loaders.variantsByIngredient.load(row),
    }),
    // Alphabetical by citation, `[]` when there are none.
    references: t.field({
      type: [ReferenceLinkRef],
      resolve: (row, _args, { loaders }) => loaders.referencesByIngredient.load(row),
    }),
    audit: t.field({ type: AuditInfo, resolve: (row) => row }),
  }),
});

import { builder } from '../../../graphql/builder';
import { AuditInfo } from '../../../graphql/schema/audit';
import {
  CATEGORY_MODES,
  INGREDIENT_ELEMENTS,
  INGREDIENT_SOURCES,
  NOMENCLATURE_KINDS,
  TOXIC_FILTERS,
} from '../schema/ingredient-enums';
import { isRetired } from '../services/cupboard-entries';
import { ReferenceLinkRef } from './references';
import { CategoryRef, DeityRef, IngredientFormValueRef } from '@/modules/vocabulary';
import type {
  FolkNameRow,
  IngredientDeityRow,
  IngredientRow,
  IngredientVariantRow,
  SubstituteRow,
} from '../types';

// `Ingredient` as DESIGN.md §7 sketches it, over the row the services return:
// every correspondence field, the tier as `isGlobal`, and the six children
// through the request's loaders, its forms among them as `variants`.
// `identityKey` and `workspaceId` stay off the wire: the key is the
// database's own, and the tier is a flag.

export const NomenclatureEnum = builder.enumType('Nomenclature', { values: NOMENCLATURE_KINDS });
// A search's toxic setting, an argument rather than a field.
export const ToxicFilterEnum = builder.enumType('ToxicFilter', {
  values: TOXIC_FILTERS,
  description:
    'Which entries a search keeps by toxicity: any (no filter); toxic, flagged on the entry or on any live form; or not_toxic, flagged on neither.',
});
// Where a coven's list reads from, an argument rather than a field.
export const IngredientSourceEnum = builder.enumType('IngredientSource', {
  values: INGREDIENT_SOURCES,
  description:
    "Where a coven's list reads from: local, the coven's own entries; or compendium, the compendium entries it holds. Leaving it out lists both.",
});
// How a search combines its categories, an argument rather than a field.
export const CategoryModeEnum = builder.enumType('CategoryMode', {
  values: CATEGORY_MODES,
  description:
    'How a search combines the categories it is given: all (the default), an entry must carry every one; or any, at least one. A category counts when it is filed on the entry or on any live form.',
});
export const IngredientElementEnum = builder.enumType('IngredientElement', {
  values: INGREDIENT_ELEMENTS,
});

// Declared before any is implemented, since the types below name one another.
export const IngredientRef = builder.objectRef<IngredientRow>('Ingredient');
export const IngredientVariantRef = builder.objectRef<IngredientVariantRow>('IngredientVariant');

/**
 * A link or a typed name (DESIGN.md §7). No `audit`, as `folkNames`
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
    // read by, never by the variant's id alone: a form takes its
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
 * One of an ingredient's alternative names. Its id is what promoting it
 * names. No `audit`.
 */
export const FolkNameRef = builder.objectRef<FolkNameRow>('FolkName').implement({
  description: 'An alternative name for an ingredient.',
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
  }),
});

/**
 * A deity picked or typed (DESIGN.md §7). No `audit`, as `folkNames`
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
 * One form of an ingredient (DESIGN.md §7): what it adds to its
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
    toxic: t.exposeBoolean('toxic', {
      description: "Whether this form is toxic: its own flag, never its ingredient's.",
    }),
    elements: t.expose('elements', { type: [IngredientElementEnum], nullable: true }),
    celestialBodies: t.exposeStringList('celestialBodies', { nullable: true }),
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
    description: t.exposeString('description', { nullable: true }),
    elements: t.expose('elements', { type: [IngredientElementEnum], nullable: true }),
    celestialBodies: t.exposeStringList('celestialBodies', { nullable: true }),
    zodiacSigns: t.exposeStringList('zodiacSigns', { nullable: true }),
    colors: t.exposeStringList('colors', { nullable: true }),
    safetyNotes: t.exposeString('safetyNotes', { nullable: true }),
    toxic: t.exposeBoolean('toxic', {
      description: 'Whether the ingredient is toxic. Each form carries its own flag.',
    }),
    isGlobal: t.boolean({ resolve: (row) => row.workspaceId === null }),
    retired: t.boolean({
      description:
        'A compendium entry the curators have retired, read by a coven whose cupboard still names it (M12.24).',
      resolve: (row) => isRetired(row),
    }),
    reviewedAt: t.field({
      type: 'DateTime',
      nullable: true,
      description:
        "When a curator marked a compendium entry reviewed: null while it needs review, and for a coven's own entry. The date only, shown to anyone; who marked it is never a field.",
      resolve: (row) => row.curatorReviewedAt,
    }),
    // The row is the loaders' key: they read `workspaceId` off it to know
    // which coven to check, and cache by `id`.
    folkNames: t.field({
      type: [FolkNameRef],
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
    // In the order entered, `[]` when there are none.
    deities: t.field({
      type: [IngredientDeityRef],
      resolve: (row, _args, { loaders }) => loaders.deitiesByIngredient.load(row),
    }),
    // By form, case aside, `[]` for an entry that is information only.
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

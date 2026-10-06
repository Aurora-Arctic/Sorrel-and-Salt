import { builder } from '../../../graphql/builder';
import { AuditInfo } from '../../../graphql/schema/audit';
import { INGREDIENT_ELEMENTS, NOMENCLATURE_KINDS } from '../schema/ingredient-enums';
import { CategoryRef } from '@/modules/vocabulary';
import type { IngredientRow, SubstituteRow } from '../types';

// `Ingredient` as DESIGN.md §7 sketches it, over the row the services return:
// every correspondence field, the tier as `isGlobal`, and the three children
// through the request's loaders. `canonicalKey` and `workspaceId` stay off
// the wire: the key is the database's own, and the tier is a flag.

export const NomenclatureEnum = builder.enumType('Nomenclature', { values: NOMENCLATURE_KINDS });
export const IngredientElementEnum = builder.enumType('IngredientElement', {
  values: INGREDIENT_ELEMENTS,
});

// Declared before `Ingredient` is implemented, since each names the other.
export const IngredientRef = builder.objectRef<IngredientRow>('Ingredient');

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
  }),
});

IngredientRef.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    slug: t.exposeString('slug'),
    canonicalName: t.exposeString('canonicalName', { nullable: true }),
    nomenclature: t.expose('nomenclature', { type: NomenclatureEnum }),
    form: t.exposeString('form', { nullable: true }),
    description: t.exposeString('description', { nullable: true }),
    elements: t.expose('elements', { type: [IngredientElementEnum], nullable: true }),
    planets: t.exposeStringList('planets', { nullable: true }),
    zodiacSigns: t.exposeStringList('zodiacSigns', { nullable: true }),
    deities: t.exposeStringList('deities', { nullable: true }),
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
    audit: t.field({ type: AuditInfo, resolve: (row) => row }),
  }),
});

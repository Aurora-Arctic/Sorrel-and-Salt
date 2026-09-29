import { builder } from '../../../graphql/builder';
import { AuditInfo } from '../../../graphql/schema/audit';
import { INGREDIENT_ELEMENTS, NOMENCLATURE_KINDS } from '../schema/ingredient-enums';
import type { IngredientRow } from '../services/compendium';
import { CategoryRef } from '@/modules/vocabulary';

// `Ingredient` as DESIGN.md §7 sketches it, over the row the services return:
// every correspondence field, the tier as `isGlobal`, and the two children
// through the request's loaders. `canonicalKey`, `workspaceId` and the
// pending-slug columns stay off the wire: the key is the database's own, the
// tier is a flag, and a claim on an address is the admin's business.

const NomenclatureEnum = builder.enumType('Nomenclature', { values: NOMENCLATURE_KINDS });
const IngredientElementEnum = builder.enumType('IngredientElement', {
  values: INGREDIENT_ELEMENTS,
});

export const IngredientRef = builder.objectRef<IngredientRow>('Ingredient').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    slug: t.exposeString('slug'),
    canonicalName: t.exposeString('canonicalName', { nullable: true }),
    nomenclature: t.expose('nomenclature', { type: NomenclatureEnum }),
    form: t.exposeString('form', { nullable: true }),
    description: t.exposeString('description', { nullable: true }),
    element: t.expose('element', { type: IngredientElementEnum, nullable: true }),
    planet: t.exposeString('planet', { nullable: true }),
    zodiac: t.exposeString('zodiac', { nullable: true }),
    deities: t.exposeStringList('deities', { nullable: true }),
    color: t.exposeString('color', { nullable: true }),
    safetyNotes: t.exposeString('safetyNotes', { nullable: true }),
    substitutes: t.exposeStringList('substitutes', { nullable: true }),
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
    audit: t.field({ type: AuditInfo, resolve: (row) => row }),
  }),
});

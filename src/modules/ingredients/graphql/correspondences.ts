import { builder } from '../../../graphql/builder';
import type { SchemaTypes } from '../../../graphql/types';
import { INGREDIENT_ELEMENTS } from '../schema/ingredient-enums';

export const IngredientElementEnum = builder.enumType('IngredientElement', {
  values: INGREDIENT_ELEMENTS,
});

// The four correspondence lists an ingredient, a form and a cupboard entry all carry,
// declared once so every type spells them the same way.

type Correspondences = {
  elements: readonly (typeof IngredientElementEnum.$inferType)[] | null;
  celestialBodies: readonly string[] | null;
  zodiacSigns: readonly string[] | null;
  colors: readonly string[] | null;
};

/** The four lists as nullable output fields, null when the row sets none. */
export function exposeCorrespondences<Parent extends Correspondences>(
  builderOfParent: PothosSchemaTypes.ObjectFieldBuilder<
    PothosSchemaTypes.ExtendDefaultTypes<SchemaTypes>,
    Parent
  >,
) {
  const t = builderOfParent as unknown as PothosSchemaTypes.ObjectFieldBuilder<
    PothosSchemaTypes.ExtendDefaultTypes<SchemaTypes>,
    Correspondences
  >;
  return {
    elements: t.expose('elements', { type: [IngredientElementEnum], nullable: true }),
    celestialBodies: t.exposeStringList('celestialBodies', { nullable: true }),
    zodiacSigns: t.exposeStringList('zodiacSigns', { nullable: true }),
    colors: t.exposeStringList('colors', { nullable: true }),
  };
}

/** The four lists as input fields, each required or each optional together. */
export function correspondenceInputFields<Required extends boolean>(
  t: PothosSchemaTypes.InputFieldBuilder<
    PothosSchemaTypes.ExtendDefaultTypes<SchemaTypes>,
    'InputObject'
  >,
  required: Required,
) {
  return {
    elements: t.field({ type: [IngredientElementEnum], required }),
    celestialBodies: t.stringList({ required }),
    zodiacSigns: t.stringList({ required }),
    colors: t.stringList({ required }),
  };
}

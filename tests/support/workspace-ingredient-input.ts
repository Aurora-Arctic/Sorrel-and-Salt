import type { createWorkspaceIngredient } from '@/modules/ingredients';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { type IngredientFixture, type Overrides, makeIngredient, variantInput } from './fixtures';

// The coven-ingredient fixture for the files that write a coven's own
// ingredients, split by concern from one file: writes, the deleted-row reads,
// and forms.

/** A W-local fixture: no formal name, and so `none`, unless one is stated. */
export function local(overrides: Overrides<IngredientFixture> = {}): IngredientFixture {
  const nomenclature = overrides.canonicalName ? 'botanical' : 'none';
  return makeIngredient({ workspaceId: WORKSPACE_W_ID, nomenclature, ...overrides });
}

/**
 * The fixture as the service's input: everything but the tier and the
 * category names, its substitutes and deities typed, and its forms whole.
 */
export function inputOf(
  fixture: IngredientFixture,
): Parameters<typeof createWorkspaceIngredient>[2] {
  const {
    workspaceId: _tier,
    categories: _categories,
    substitutes,
    deities,
    variants,
    ...input
  } = fixture;
  return {
    ...input,
    variants: variants.map((variant) => variantInput(variant)),
    substitutes: substitutes.map((name) => ({ ingredientId: null, name })),
    deities: deities.map((name) => ({ deityId: null, name })),
  };
}

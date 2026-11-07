import type { createWorkspaceIngredient } from '@/modules/ingredients';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { type IngredientFixture, type Overrides, makeIngredient, variantInput } from './fixtures';

export function local(overrides: Overrides<IngredientFixture> = {}): IngredientFixture {
  const nomenclature = overrides.canonicalName ? 'botanical' : 'none';
  return makeIngredient({ workspaceId: WORKSPACE_W_ID, nomenclature, ...overrides });
}

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

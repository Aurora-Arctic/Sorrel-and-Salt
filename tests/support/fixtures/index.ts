// The factories, in one import: a test states the one thing it is about and the factory answers the rest,
// including fields a CHECK binds together. Plain objects (claude-docs/testing/fixture-factories.md, "Fixture factories").

export { ingredientColumns, makeIngredient, makeVariant, variantInput } from './ingredient';
export { makeSpell, spellColumns } from './spell';
export { makeWorkspace, workspaceColumns } from './workspace';
export type { IngredientFixture, Overrides, SpellOverrides, VariantInput } from './types';

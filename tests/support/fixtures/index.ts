// The factories, in one import: a test states the one thing it is about and the factory answers the rest,
// including fields a CHECK binds together. Plain objects (claude-docs/testing/fixture-factories.md, "Fixture factories").

export { toColumns } from './columns';
export {
  NOMENCLATURE_KINDS,
  ingredientColumns,
  makeIngredient,
  makeVariant,
  variantInput,
} from './ingredient';
export { mergeFixture, stated } from './merge';
export { makeSpell, spellColumns, spellStepColumns } from './spell';
export { makeWorkspace, workspaceColumns } from './workspace';
export type {
  IngredientFixture,
  Overrides,
  SpellFixture,
  SpellStepFixture,
  SpellStepOverrides,
  SpellOverrides,
  VariantFixture,
  VariantInput,
  WorkspaceFixture,
  WorkspaceMemberFixture,
} from './types';

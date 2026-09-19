// The factories, in one import: a test states the one thing it is about and
// the factory answers the rest, including the fields a CHECK binds together.
// Plain objects, not inserts — nothing here touches Postgres.
// claude-docs/testing.md, "Fixture factories".

export { toColumns } from './columns';
export {
  type IngredientFixture,
  NOMENCLATURE_KINDS,
  ingredientColumns,
  makeIngredient,
} from './ingredient';
export { type Overrides, mergeFixture, stated } from './merge';
export {
  type SpellFixture,
  type SpellLayerFixture,
  type SpellLayerOverrides,
  type SpellOverrides,
  makeSpell,
  spellColumns,
  spellLayerColumns,
} from './spell';
export {
  type WorkspaceFixture,
  type WorkspaceMemberFixture,
  makeWorkspace,
  workspaceColumns,
} from './workspace';

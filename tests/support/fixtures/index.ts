// The factories, in one import: a test states the one thing it is about and
// the factory answers the rest, including the fields a CHECK binds together.
// Plain objects, not inserts — nothing here touches Postgres.
// claude-docs/testing.md, "Fixture factories".

export { toColumns } from './columns';
export { NOMENCLATURE_KINDS, ingredientColumns, makeIngredient } from './ingredient';
export { mergeFixture, stated } from './merge';
export { makeSpell, spellColumns, spellLayerColumns } from './spell';
export { makeWorkspace, workspaceColumns } from './workspace';
export type {
  IngredientFixture,
  Overrides,
  SpellFixture,
  SpellLayerFixture,
  SpellLayerOverrides,
  SpellOverrides,
  WorkspaceFixture,
  WorkspaceMemberFixture,
} from './types';

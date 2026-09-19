// M1.25 — the factories, in one import.
//
// DESIGN.md §11: "`fixtures/` factories, so tests read `makeIngredient({
// categories: ['protection'] })`". A test states the one thing it is about and
// the factory answers everything else, including the fields that have to agree
// with each other — an ingredient's `nomenclature` with its `canonicalName`, a
// workspace's slug with its name, a spell layer's `name` with its
// `ingredientId`. Each of those is a constraint the database enforces, and a
// fixture that got one wrong would fail a test for a reason the test was not
// about.
//
// They are plain objects, not inserts: nothing here touches Postgres, which is
// what lets the `unit` project test them and what leaves each caller to write
// its own row the way it already does.

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

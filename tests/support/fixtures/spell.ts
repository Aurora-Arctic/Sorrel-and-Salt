import type { spellIngredients } from '@/db/schema/spell-ingredients';
import type { spells } from '@/db/schema/spells';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { toColumns } from './columns';
import { type Overrides, mergeFixture, stated } from './merge';

// M1.25 — a jar: the spell row, the categories it intends, and the stack
// inside it.
//
// Two kinds of thing are deliberately kept apart here. The **assigned**
// categories below are what the spell intends (`spell_categories`); the
// derived ones are the union of its ingredients' and are computed rather than
// stated, so a fixture has none to give (DESIGN.md §9). Conflating them is a
// bug CLAUDE.md names by hand.

/**
 * One layer of the stack. It points at an ingredient *or* names one of its own
 * (MB.40, story 57):
 * `num_nonnulls(ingredient_id, name) = 1`, with `form` allowed only beside a
 * name. `makeSpell` keeps that true rather than leaving it to the caller — see
 * below.
 */
export interface SpellLayerFixture extends Required<
  Pick<
    typeof spellIngredients.$inferInsert,
    'ingredientId' | 'name' | 'form' | 'quantity' | 'unit' | 'note' | 'layerOrder'
  >
> {}

/**
 * What a test says about a layer. `layerOrder` is absent: it is the layer's
 * position in the stack, so stating it as well would be two answers to one
 * question — the rule src/db/seed/demo.ts already follows.
 */
export type SpellLayerOverrides = Omit<Overrides<SpellLayerFixture>, 'layerOrder'>;

/** A spell, plus the categories it intends and the layers it is built from. */
export interface SpellFixture extends Required<
  Pick<
    typeof spells.$inferInsert,
    | 'workspaceId'
    | 'title'
    | 'intent'
    | 'jarSize'
    | 'sealWaxColor'
    | 'moonPhase'
    | 'dayOfWeek'
    | 'instructions'
    | 'status'
  >
> {
  /** §6 categories by name — what the spell *intends*, never what its contents imply (§9). */
  categories: string[];
  layers: SpellLayerFixture[];
}

export type SpellOverrides = Omit<Overrides<SpellFixture>, 'layers'> & {
  layers?: SpellLayerOverrides[];
};

// Invented, like every ingredient name a fixture supplies on its own. A custom
// layer's name is scoped to its spell and so could not collide with a seeded
// row, but the rule is one rule — and `Hearth Ash` was the demo scenario's own
// workspace ingredient.
const DEFAULT_LAYER_NAME = 'Fixture Ash';

// A custom layer rather than a linked one, and that is the whole reason
// `makeSpell()` is insertable on its own: a layer pointing at an ingredient
// needs that ingredient inserted first, where a layer that names itself needs
// nothing but the spell.
const DEFAULT_LAYER: SpellLayerFixture = {
  ingredientId: null,
  name: DEFAULT_LAYER_NAME,
  form: 'ash',
  quantity: '1.000',
  unit: 'pinch',
  note: null,
  layerOrder: 1,
};

const DEFAULTS: SpellFixture = {
  // W, the workspace the fixture cast works in — the same one `standard`
  // seeds, so a fixture spell and a seeded spell sit in the same coven.
  workspaceId: WORKSPACE_W_ID,
  title: 'Hearth Warding Jar',
  intent: null,
  jarSize: null,
  sealWaxColor: null,
  moonPhase: null,
  dayOfWeek: null,
  instructions: null,
  // M10.20's default, restated rather than left to the column: a fixture that
  // arrived `complete` would quietly be a finished spell in every test that
  // never mentioned status.
  status: 'draft',
  categories: [],
  layers: [DEFAULT_LAYER],
};

/**
 * A defaulted layer's name, which has to differ from its neighbours':
 * `spell_ingredients_spell_id_custom_name_unique` folds `Salt` onto `salt`
 * within one jar, so three layers all defaulting to `Hearth Ash` would be a
 * fixture that cannot be inserted. The first keeps the plain name and the rest
 * take their own depth, which is the number the row carries anyway.
 */
function defaultLayerName(layerOrder: number): string {
  return layerOrder === 1 ? DEFAULT_LAYER_NAME : `${DEFAULT_LAYER_NAME} ${layerOrder}`;
}

/**
 * One layer, at the depth its position gives it.
 *
 * A layer that names an ingredient is a *linked* layer, and a linked layer
 * carries neither a name nor a form of its own — the first because
 * `num_nonnulls(ingredient_id, name) = 1` admits exactly one of the two, the
 * second because a form beside an ingredient id would shadow half that
 * ingredient's identity (`spell_ingredients_form_only_on_custom`). Merging
 * would leave the default's name and form in place and break both checks at
 * once, so naming an ingredient clears them — unless the caller stated them
 * too, which is how a test writes the row a check exists to reject.
 */
function makeLayer(overrides: SpellLayerOverrides, index: number): SpellLayerFixture {
  const layerOrder = index + 1;
  const defaults: SpellLayerFixture = {
    ...DEFAULT_LAYER,
    name: defaultLayerName(layerOrder),
    layerOrder,
  };
  const layer = mergeFixture(defaults, overrides as Overrides<SpellLayerFixture>);

  if (stated(overrides, 'ingredientId') && layer.ingredientId !== null) {
    if (!stated(overrides, 'name')) layer.name = null;
    if (!stated(overrides, 'form')) layer.form = null;
  }

  // Stated last rather than merged: the depth is the position, and the
  // override type has no way to say otherwise.
  layer.layerOrder = layerOrder;

  return layer;
}

/**
 * One spell.
 *
 * ```ts
 * makeSpell()                                      // a draft in W, one custom layer
 * makeSpell({ categories: ['Warding'] })           // intending warding and nothing else
 * makeSpell({ layers: [{ ingredientId: mugwort }] }) // a stack of one linked layer
 * ```
 */
export function makeSpell(overrides: SpellOverrides = {}): SpellFixture {
  const { layers, ...rest } = overrides;
  const spell = mergeFixture(DEFAULTS, rest as Overrides<SpellFixture>);

  if (layers !== undefined) {
    spell.layers = layers.map(makeLayer);
  }

  return spell;
}

/**
 * The fixture as an insert into `spells` — for the tests that talk to Postgres
 * directly. The categories and the layers belong to other tables; the audit
 * stamps come from the session (CLAUDE.md rule 3).
 */
export function spellColumns(fixture: SpellFixture): Record<string, unknown> {
  const { categories: _categories, layers: _layers, ...row } = fixture;
  return toColumns(row);
}

/**
 * One layer as an insert into `spell_ingredients`. The spell it belongs to is
 * the caller's — a fixture layer has no id to point at until the spell it is
 * part of has been written.
 */
export function spellLayerColumns(layer: SpellLayerFixture): Record<string, unknown> {
  return toColumns(layer);
}

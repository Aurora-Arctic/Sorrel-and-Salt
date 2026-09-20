import type { spellIngredients } from '@/db/schema/spell-ingredients';
import type { spells } from '@/db/schema/spells';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { toColumns } from './columns';
import { type Overrides, mergeFixture, stated } from './merge';

// A jar: the spell row, the categories it intends, and the stack inside it.
// The categories here are the *assigned* ones; derived categories are computed
// from the ingredients, so a fixture has none to give.

/**
 * One layer of the stack: it points at an ingredient *or* names one of its own
 * (`num_nonnulls(ingredient_id, name) = 1`), with `form` only beside a name.
 */
export interface SpellLayerFixture extends Required<
  Pick<
    typeof spellIngredients.$inferInsert,
    'ingredientId' | 'name' | 'form' | 'quantity' | 'unit' | 'note' | 'layerOrder'
  >
> {}

/**
 * What a test says about a layer. `layerOrder` is the position in the array,
 * so it cannot be stated as well.
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
    | 'visibility'
  >
> {
  /** §6 categories by name — what the spell *intends*, never what its contents imply (§9). */
  categories: string[];
  layers: SpellLayerFixture[];
}

export type SpellOverrides = Omit<Overrides<SpellFixture>, 'layers'> & {
  layers?: SpellLayerOverrides[];
};

// Invented, like every name a fixture supplies on its own (CLAUDE.md, Testing).
const DEFAULT_LAYER_NAME = 'Fixture Ash';
// Custom rather than linked, so `makeSpell()` is insertable with no ingredient
// inserted first.
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
  // W, so a fixture spell and a seeded spell sit in the same coven.
  workspaceId: WORKSPACE_W_ID,
  title: 'Hearth Warding Jar',
  intent: null,
  jarSize: null,
  sealWaxColor: null,
  moonPhase: null,
  dayOfWeek: null,
  instructions: null,
  // Both restated rather than left to the column: a fixture arriving
  // `complete` would be a finished spell in every test that never mentioned
  // status, and one arriving `private` would be a spell only its author can
  // read in every test that never mentioned visibility.
  status: 'draft',
  visibility: 'workspace',
  categories: [],
  layers: [DEFAULT_LAYER],
};

/**
 * Defaulted layers take distinct names:
 * `spell_ingredients_spell_id_custom_name_unique` folds `Salt` onto `salt`
 * within one jar.
 */
function defaultLayerName(layerOrder: number): string {
  return layerOrder === 1 ? DEFAULT_LAYER_NAME : `${DEFAULT_LAYER_NAME} ${layerOrder}`;
}

/**
 * One layer, at the depth its position gives it. Naming an ingredient makes it
 * a linked layer, which clears the default name and form — `num_nonnulls`
 * admits one of the two, and `spell_ingredients_form_only_on_custom` refuses
 * a form beside an id — unless the caller stated them, which is how a test
 * writes the row a check exists to reject.
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

  // The depth is the position; the override type cannot say otherwise.
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
 * The fixture as an insert into `spells`; categories and layers are other
 * tables' rows, and the audit stamps are the session's (rule 3).
 */
export function spellColumns(fixture: SpellFixture): Record<string, unknown> {
  const { categories: _categories, layers: _layers, ...row } = fixture;
  return toColumns(row);
}

/** One layer as an insert into `spell_ingredients`; the spell id is the caller's to add. */
export function spellLayerColumns(layer: SpellLayerFixture): Record<string, unknown> {
  return toColumns(layer);
}

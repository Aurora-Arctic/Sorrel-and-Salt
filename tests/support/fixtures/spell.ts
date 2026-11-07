import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { toColumns } from './columns';
import { mergeFixture, stated } from './merge';
import type {
  SpellStepFixture,
  SpellStepOverrides,
  SpellFixture,
  SpellOverrides,
  Overrides,
} from './types';

// The categories here are the *assigned* ones; derived categories are computed from the ingredients, so a fixture has none to give.

const DEFAULT_LAYER_NAME = 'Fixture Ash';
// A layer, custom rather than linked, so `makeSpell()` is insertable with no
// ingredient inserted first.
const DEFAULT_STEP: SpellStepFixture = {
  ingredientId: null,
  name: DEFAULT_LAYER_NAME,
  form: 'ash',
  quantity: '1.000',
  unit: 'pinch',
  body: null,
  position: 1,
};

const DEFAULTS: SpellFixture = {
  // W, so a fixture spell and a seeded spell sit in the same coven.
  workspaceId: WORKSPACE_W_ID,
  title: 'Hearth Warding Jar',
  intent: null,
  jarDescription: null,
  sealWaxColor: null,
  moonPhase: null,
  dayOfWeek: null,
  note: null,
  // Both restated rather than left to the column, so a fixture is not a finished or shared spell in every
  // test that never mentioned status or visibility.
  status: 'draft',
  visibility: 'workspace',
  categories: [],
  steps: [DEFAULT_STEP],
};

/**
 * Defaulted layers take distinct names:
 * `spell_steps_spell_id_custom_name_unique` folds `Salt` onto `salt` within
 * one jar.
 */
function defaultLayerName(position: number): string {
  return position === 1 ? DEFAULT_LAYER_NAME : `${DEFAULT_LAYER_NAME} ${position}`;
}

/**
 * One step, at the place its index gives it. Naming an ingredient makes it a linked layer and clears the
 * default name and form; a `body` and no identity makes it an instruction and clears name, form and amount.
 * Stating the field undoes either, so a test can write the row a check rejects.
 */
function makeStep(overrides: SpellStepOverrides, index: number): SpellStepFixture {
  const position = index + 1;
  const defaults: SpellStepFixture = {
    ...DEFAULT_STEP,
    name: defaultLayerName(position),
    position,
  };
  const step = mergeFixture(defaults, overrides as Overrides<SpellStepFixture>);

  if (stated(overrides, 'ingredientId') && step.ingredientId !== null) {
    if (!stated(overrides, 'name')) step.name = null;
    if (!stated(overrides, 'form')) step.form = null;
  }
  if (
    stated(overrides, 'body') &&
    step.body !== null &&
    !stated(overrides, 'ingredientId') &&
    !stated(overrides, 'name')
  ) {
    step.name = null;
    if (!stated(overrides, 'form')) step.form = null;
    if (!stated(overrides, 'quantity')) step.quantity = null;
    if (!stated(overrides, 'unit')) step.unit = null;
  }

  step.position = position;

  return step;
}

export function makeSpell(overrides: SpellOverrides = {}): SpellFixture {
  const { steps, ...rest } = overrides;
  const spell = mergeFixture(DEFAULTS, rest as Overrides<SpellFixture>);

  if (steps !== undefined) {
    spell.steps = steps.map(makeStep);
  }

  return spell;
}

export function spellColumns(fixture: SpellFixture): Record<string, unknown> {
  const { categories: _categories, steps: _steps, ...row } = fixture;
  return toColumns(row);
}

export function spellStepColumns(step: SpellStepFixture): Record<string, unknown> {
  return toColumns(step);
}

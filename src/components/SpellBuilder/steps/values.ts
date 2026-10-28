import type { SpellBuilderStepFragment } from '../../../gql/graphql';
import type { Unit } from '@/modules/ingredients/schema/units';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import { UNMEASURABLE_UNIT, measurable } from '@/modules/grimoire/validation/step-unit';
import type { SpellStepSend, SpellStepValue, StepCategory } from './types';

// The step list's values: a saved step as the builder holds it, a held step as
// a save sends it, and what the list works out from its steps — the unit rule
// (story 77) and the derived categories. No React here.

/** The categories a step brings: its ingredient's and its form's, once each. */
const categoriesOf = (step: SpellBuilderStepFragment): StepCategory[] => [
  ...(step.ingredient?.categories ?? []),
  ...(step.variant?.categories ?? []),
];

/** The unit of the coven's jar of `variantId`, from the ingredient's jars: a form has one jar per coven. */
export const jarUnitOf = (
  stock: readonly { unit: string | null; variant: { id: string } }[],
  variantId: string,
): Unit | null => (stock.find((jar) => jar.variant.id === variantId)?.unit as Unit | null) ?? null;

/** A saved step as the builder holds it. */
export function stepValueOf(step: SpellBuilderStepFragment): SpellStepValue {
  const variantId = step.variant?.id ?? null;
  return {
    stepId: step.id,
    ingredientId: step.ingredient?.id ?? null,
    variantId,
    name: step.name,
    form: step.form,
    quantity: step.quantity === null ? '' : String(step.quantity),
    unit: step.unit ?? '',
    savedUnit: step.unit,
    body: step.body,
    note: step.note,
    icon: step.variant?.formChoice?.group.icon ?? null,
    categories: categoriesOf(step),
    jarUnit:
      variantId === null || step.ingredient === null
        ? null
        : jarUnitOf(step.ingredient.stock, variantId),
  };
}

/** A new step, as the picker or the one-off adds it: no amount yet. */
export const newStep = (
  step: Pick<
    SpellStepValue,
    'ingredientId' | 'variantId' | 'name' | 'form' | 'icon' | 'categories' | 'jarUnit'
  >,
): SpellStepValue => ({
  ...step,
  stepId: null,
  quantity: '',
  unit: '',
  savedUnit: null,
  body: null,
  note: null,
});

/** `value` with its blank keys left out, so a save sends only what a step holds. */
function present<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, field]) => field !== null && field !== undefined && field !== '',
    ),
  ) as Partial<T>;
}

/**
 * A step as a save sends it: a linked step by its ingredient and form ids,
 * never the cupboard entry or jar it was picked from, and with no name or
 * form, which the ingredient gives; a one-off by its name and form.
 */
export function stepInputOf(step: SpellStepValue): SpellStepSend {
  const quantity = step.quantity.trim();
  const shared = {
    id: step.stepId,
    quantity: quantity === '' ? null : Number(quantity),
    unit: (step.unit || null) as Unit | null,
    body: step.body,
    note: step.note,
  };
  return present(
    step.ingredientId === null
      ? { ...shared, name: step.name, form: step.form }
      : { ...shared, ingredientId: step.ingredientId, variantId: step.variantId },
  ) as SpellStepSend;
}

/**
 * Story 77 ahead of the save: each step whose unit its coven's jar cannot be
 * measured in, by index, as the service judges it — a step with no unit, no
 * jar or a jar with no unit passes, and so does a saved step's unchanged unit.
 */
export function unitIssues(steps: readonly SpellStepValue[]): Map<number, string> {
  const issues = new Map<number, string>();
  steps.forEach((step, index) => {
    if (step.unit === '' || step.jarUnit === null) return;
    if (step.stepId !== null && step.unit === step.savedUnit) return;
    if (!measurable(step.unit as Unit, step.jarUnit)) issues.set(index, UNMEASURABLE_UNIT);
  });
  return issues;
}

/** Whether `steps` differ from the saved `saved`, as a save would send them. */
export const stepsChanged = (
  steps: readonly SpellStepValue[],
  saved: readonly SpellStepValue[],
): boolean => JSON.stringify(steps.map(stepInputOf)) !== JSON.stringify(saved.map(stepInputOf));

/**
 * The spell's derived categories: the union of its steps', once each, sorted
 * by name, as the service derives them. A one-off or instruction brings none.
 */
export function derivedCategories(steps: readonly SpellStepValue[]): StepCategory[] {
  const byId = new Map(steps.flatMap((step) => step.categories).map((c) => [c.id, c]));
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// An instruction is named by its text, cut short where it runs on, since its
// name is read before every move of it and every Add and Remove.
const INSTRUCTION_NAME_LENGTH = 40;

/**
 * What a step is called where it is read out: "Fixture Rosewort", or with its
 * form, "Fixture Rosewort (Dried Leaf)"; an instruction, by its text.
 */
export function stepNameOf({ name, form, body }: SpellStepValue): string {
  if (name === null) {
    const text = (body ?? '').trim();
    return text.length > INSTRUCTION_NAME_LENGTH
      ? `${text.slice(0, INSTRUCTION_NAME_LENGTH).trimEnd()}…`
      : text;
  }
  return form ? `${name} (${formLabel(form)})` : name;
}

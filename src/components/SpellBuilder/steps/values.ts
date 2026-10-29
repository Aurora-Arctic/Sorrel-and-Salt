import type { SpellBuilderStep } from '../types';
import type { Unit } from '@/modules/ingredients/schema/units';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import { UNMEASURABLE_UNIT, measurable } from '@/modules/grimoire/validation/step-unit';
import type { SpellStepSend, SpellStepValue, StepCategory, StepJar } from './types';
import type { SafetyMarkProps } from '../../SafetyNote/types';

// The step list's values: a saved step as the builder holds it, a held step as
// a save sends it, and what the list works out from its steps — the unit rule
// and the derived categories. No React here.

/** The categories a step brings: its ingredient's and its form's, once each. */
const categoriesOf = (step: SpellBuilderStep): StepCategory[] => [
  ...(step.ingredient?.categories ?? []),
  ...(step.variant?.categories ?? []),
];

type JarRow = {
  unit: string | null;
  quantityOnHand: number | null;
  lowStockThreshold: number | null;
  variant: { id: string };
};

/** The coven's jar of `variantId`, from the ingredient's jars: a form has one jar per coven. Null where it holds none. */
export const jarOf = (stock: readonly JarRow[], variantId: string): StepJar | null => {
  const jar = stock.find((row) => row.variant.id === variantId);
  return jar
    ? {
        unit: jar.unit as Unit | null,
        quantity: jar.quantityOnHand,
        threshold: jar.lowStockThreshold,
      }
    : null;
};

/** The unit of that jar; null where there is none, or one with no unit. */
export const jarUnitOf = (stock: readonly JarRow[], variantId: string): Unit | null =>
  jarOf(stock, variantId)?.unit ?? null;

/** A saved step as the builder holds it. */
export function stepValueOf(step: SpellBuilderStep): SpellStepValue {
  const variantId = step.variant?.id ?? null;
  return {
    stepId: step.id,
    rowKey: step.id,
    ingredientId: step.ingredient?.id ?? null,
    variantId,
    name: step.name,
    form: step.form,
    quantity: step.quantity === null ? '' : String(step.quantity),
    unit: step.unit ?? '',
    savedUnit: step.unit,
    body: step.body,
    icon: step.variant?.formChoice?.group.icon ?? null,
    categories: categoriesOf(step),
    safety:
      step.ingredient === null
        ? null
        : {
            toxic: step.ingredient.toxic,
            safetyNotes: step.ingredient.safetyNotes,
            formToxic: step.variant?.toxic ?? false,
            formSafetyNotes: step.variant?.safetyNotes ?? null,
          },
    jarUnit:
      variantId === null || step.ingredient === null
        ? null
        : jarUnitOf(step.ingredient.stock, variantId),
    jar:
      variantId === null || step.ingredient === null
        ? null
        : jarOf(step.ingredient.stock, variantId),
  };
}

let rowKeys = 0;
/** A key for a step added in the browser; only ever made in an event, never while rendering. */
const newRowKey = (): string =>
  `new-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${rowKeys++}`}`;

/**
 * Steps written back from stored values made safe to save: an unknown saved id becomes none (added as new) and a step with no row key gets one.
 * `live` is the ids of the spell's steps as last saved.
 * (claude-docs/components/spell-builder.md, "Step values, documents and totals").
 */
export const restoredSteps = (
  steps: readonly SpellStepValue[],
  live: ReadonlySet<string>,
): SpellStepValue[] =>
  steps.map((step) => {
    const stepId = step.stepId !== null && !live.has(step.stepId) ? null : step.stepId;
    const rowKey = step.rowKey ?? stepId ?? newRowKey();
    return stepId === step.stepId && rowKey === step.rowKey ? step : { ...step, stepId, rowKey };
  });

/** A new step, as the picker or the one-off adds it: no quantity yet, and the unit its jar is kept in. */
export const newStep = (
  step: Pick<
    SpellStepValue,
    | 'ingredientId'
    | 'variantId'
    | 'name'
    | 'form'
    | 'icon'
    | 'categories'
    | 'safety'
    | 'jarUnit'
    | 'jar'
  >,
): SpellStepValue => ({
  ...step,
  stepId: null,
  rowKey: newRowKey(),
  quantity: '',
  // The unit its form is stocked in, where the coven holds some: a start the member can change.
  unit: step.jarUnit ?? '',
  savedUnit: null,
  body: null,
});

/** A new instruction-only step: no ingredient, and a blank text the member writes. */
export const newInstruction = (): SpellStepValue => ({
  ...newStep({
    ingredientId: null,
    variantId: null,
    name: null,
    form: null,
    icon: null,
    categories: [],
    safety: null,
    jarUnit: null,
    jar: null,
  }),
  body: '',
});

/**
 * The props `SafetyMark` and `SafetyNote` take for a step: its ingredient's flag and
 * notes with the form laid. Null when the step has no entry to read, so a one-off
 * draws nothing rather than something that reads as safe.
 */
export function safetyOf(
  step: Pick<SpellStepValue, 'safety' | 'form'>,
): (SafetyMarkProps & { variants: NonNullable<SafetyMarkProps['variants']> }) | null {
  if (step.safety === null) return null;
  return {
    toxic: step.safety.toxic,
    safetyNotes: step.safety.safetyNotes,
    variants: [
      {
        form: step.form ?? '',
        toxic: step.safety.formToxic,
        safetyNotes: step.safety.formSafetyNotes,
      },
    ],
  };
}

/**
 * What a member who cannot see the badge is told as a step is added: that its
 * ingredient is flagged toxic, or carries a caution; null when it has neither,
 * and for a one-off, which has no entry to say (and is not called safe).
 */
export function warningOf(step: Pick<SpellStepValue, 'safety' | 'form'>): string | null {
  const safety = safetyOf(step);
  if (safety === null) return null;
  if (safety.toxic || safety.variants.some((variant) => variant.toxic)) return 'Warning: Toxic.';
  const noted = [safety.safetyNotes, ...safety.variants.map((variant) => variant.safetyNotes)];
  return noted.some((notes) => (notes ?? '').trim() !== '') ? 'Caution: has safety notes.' : null;
}

/** Whether `step` is only an instruction: no ingredient and no one-off name. */
export const isInstruction = (step: Pick<SpellStepValue, 'ingredientId' | 'name'>): boolean =>
  step.ingredientId === null && step.name === null;

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
  };
  const sent = present(
    step.ingredientId === null
      ? { ...shared, name: step.name, form: step.form }
      : { ...shared, ingredientId: step.ingredientId, variantId: step.variantId },
  ) as SpellStepSend;
  // A blank text is dropped from a step that has an ingredient, which needs
  // none, but kept on an instruction-only step so the schema refuses it at
  // its own field rather than as a step that says nothing.
  if (isInstruction(step)) return { ...sent, body: step.body ?? '' };
  // A one-off's name emptied in its Name field is still sent, so the schema refuses it at that
  // field and not as a step with no identity.
  return step.ingredientId === null && step.name !== null ? { ...sent, name: step.name } : sent;
}

/**
 * Ahead of the save: each step whose unit its coven's jar cannot be
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

/** What an instruction is called before anything is written in it. */
const BLANK_INSTRUCTION = 'New Instruction';

/**
 * What a step is called where it is read out: "Fixture Rosewort", or with its
 * form, "Fixture Rosewort (Dried Leaf)"; an instruction, by its text.
 */
export function stepNameOf({ name, form, body }: SpellStepValue): string {
  if (name === null) {
    const text = (body ?? '').trim();
    if (text === '') return BLANK_INSTRUCTION;
    return text.length > INSTRUCTION_NAME_LENGTH
      ? `${text.slice(0, INSTRUCTION_NAME_LENGTH).trimEnd()}…`
      : text;
  }
  return form ? `${name} (${formLabel(form)})` : name;
}

/** Whether `step` is an instruction with no text. */
const blankInstruction = (step: SpellStepValue): boolean =>
  isInstruction(step) && (step.body ?? '').trim() === '';

/**
 * A new instruction with no text yet. The autosave leaves it out of what it
 * sends, since a save would refuse it, and says nothing: the row waits in the
 * form until it is written, removed, or Save or Close checks the whole form.
 */
export const isBlankNewInstruction = (step: SpellStepValue): boolean =>
  step.stepId === null && blankInstruction(step);

/**
 * A saved instruction whose text has been cleared. Leaving it out would
 * delete it, so the autosave holds back altogether until it is written or
 * removed.
 */
export const isBlankSavedInstruction = (step: SpellStepValue): boolean =>
  step.stepId !== null && blankInstruction(step);

import 'server-only';
import { findReadableVariants, type AuditWriter } from '../../../db/repository';
import { spellSteps } from '../schema/spell-steps';
import { ValidationError } from '../../../lib/errors';
import type { ValidationIssue } from '../../../lib/types';
import type { Membership } from '@/modules/coven';
import { jarsOfForms } from '@/modules/ingredients';
import type { SpellStepRow } from '../types';
import type { z } from 'zod';
import type { SpellStepInput } from '../validation/spell-step';
import { UNMEASURABLE_UNIT, measurable } from '../validation/step-unit';

// How a save writes a spell's recipe: the steps a member sends are
// the whole recipe, in order, so a step's place is its index, a saved step
// left out is removed, and a step with no id is new. claude-docs/db/grimoire.md,
// "Saving a recipe", says why each part is the way it is.

type ParsedStep = z.output<typeof SpellStepInput>;

/** The step row's own columns as a save writes them: every one stated, so a field left out is cleared. */
function stepColumns(step: ParsedStep, place: number) {
  return {
    body: step.body ?? null,
    ingredientId: step.ingredientId ?? null,
    variantId: step.variantId ?? null,
    name: step.name ?? null,
    form: step.form ?? null,
    // The column is `numeric`, which the driver reads and writes as text.
    quantity: step.quantity == null ? null : String(step.quantity),
    unit: step.unit ?? null,
    position: place,
  };
}

/** Whether writing `columns` would leave `row` as it is. */
function unchanged(columns: ReturnType<typeof stepColumns>, row: SpellStepRow): boolean {
  return Object.entries(columns).every(([key, value]) => {
    const stored = row[key as keyof typeof columns];
    // `2` and the stored `2.000` are one quantity.
    if (key === 'quantity')
      return (value == null ? null : Number(value)) === (stored == null ? null : Number(stored));
    return value === stored;
  });
}

/** Whether the step lays a different ingredient, form or custom name than the row. */
function identityChanged(step: ParsedStep, row: SpellStepRow): boolean {
  return (
    (step.ingredientId ?? null) !== row.ingredientId ||
    (step.variantId ?? null) !== row.variantId ||
    (step.name?.toLowerCase() ?? null) !== (row.name?.toLowerCase() ?? null)
  );
}

/**
 * Refuses, before anything is written, a step that names a saved step this
 * spell has no live row for, and a link the coven may not lay: a form that is
 * not live, of an ingredient that is not live in the compendium or this
 * coven, or of another ingredient than the step names. A saved step whose
 * link is unchanged is not checked again, so a step laying an ingredient
 * deleted since keeps it (claude-docs/db/spell-visibility.md, "What a spell
 * holds").
 *
 * @throws {ValidationError} at each offending step's `id` or `ingredientId`.
 */
export async function checkRecipe(
  membership: Membership,
  steps: readonly ParsedStep[],
  existing: readonly SpellStepRow[],
): Promise<void> {
  const saved = new Map(existing.map((row) => [row.id, row]));
  const issues: ValidationIssue[] = [];

  const toCheck: { index: number; step: ParsedStep }[] = [];
  steps.forEach((step, index) => {
    const row = step.id == null ? undefined : saved.get(step.id);
    if (step.id != null && !row) {
      issues.push({ path: ['steps', index, 'id'], message: 'This step is not one of the spell’s' });
      return;
    }
    if (step.variantId != null && (!row || identityChanged(step, row))) {
      toCheck.push({ index, step });
    }
  });

  const readable = await findReadableVariants(
    [membership],
    toCheck.map(({ step }) => step.variantId as string),
  );
  const ingredientOf = new Map(readable.map((variant) => [variant.id, variant.ingredientId]));
  for (const { index, step } of toCheck) {
    if (ingredientOf.get(step.variantId as string) !== step.ingredientId) {
      issues.push({
        path: ['steps', index, 'ingredientId'],
        message: 'Choose an ingredient from the list',
      });
    }
  }

  issues.push(...(await unmeasurableSteps(membership, steps, saved)));
  if (issues.length > 0) throw new ValidationError(issues);
}

/**
 * A step laying a form the coven holds a jar of, in a unit that jar cannot be measured in. Which steps are exempt:
 * claude-docs/db/grimoire.md, "Grimoire service and schema details".
 */
async function unmeasurableSteps(
  membership: Membership,
  steps: readonly ParsedStep[],
  saved: ReadonlyMap<string, SpellStepRow>,
): Promise<ValidationIssue[]> {
  const toMeasure = steps.flatMap((step, index) => {
    if (step.variantId == null || step.unit == null) return [];
    const row = step.id == null ? undefined : saved.get(step.id);
    if (row && row.variantId === step.variantId && row.unit === step.unit) return [];
    return [{ index, variantId: step.variantId, unit: step.unit }];
  });
  if (toMeasure.length === 0) return [];

  const jars = await jarsOfForms(membership, [...new Set(toMeasure.map((step) => step.variantId))]);
  const jarUnitOf = new Map(jars.map((jar) => [jar.variantId, jar.unit]));
  return toMeasure.flatMap(({ index, variantId, unit }) => {
    const jarUnit = jarUnitOf.get(variantId);
    if (jarUnit == null || measurable(unit, jarUnit)) return [];
    return [
      {
        path: ['steps', index, 'unit'],
        message: UNMEASURABLE_UNIT,
      },
    ];
  });
}

/**
 * Writes the recipe `steps` over the spell's live `existing` steps, inside the caller's transaction. A moving step is first
 * moved aside to a free place and name, because the unique indexes are checked row by row. Call `checkRecipe` first.
 */
export async function writeRecipe(
  write: AuditWriter,
  spellId: string,
  steps: readonly ParsedStep[],
  existing: readonly SpellStepRow[],
): Promise<void> {
  const kept = new Set(steps.flatMap((step) => (step.id == null ? [] : [step.id])));
  await write.softDeleteByIds(
    spellSteps,
    existing.filter((row) => !kept.has(row.id)).map((row) => row.id),
  );

  const saved = new Map(existing.map((row) => [row.id, row]));
  const moves = steps.flatMap((step, index) => {
    const row = step.id == null ? undefined : saved.get(step.id);
    return row ? [{ step, row, place: index + 1 }] : [];
  });

  // Aside: a negative place no live step holds, and for a step changing what
  // it lays, a custom name only it could have, which every CHECK accepts.
  for (const { step, row, place } of moves) {
    const moving = row.position !== place;
    // Only a custom name is a unique identity now; one form may sit in many steps, so a step
    // changing from one form to another meets nothing and is written in place.
    const relinking = identityChanged(step, row) && (row.name != null || step.name != null);
    if (!moving && !relinking) continue;
    await write.updateById(spellSteps, row.id, {
      position: -place,
      ...(relinking && {
        ingredientId: null,
        variantId: null,
        name: `moving ${row.id}`,
        form: null,
      }),
    });
  }

  // A step the save leaves exactly as it was is not written, so its
  // `updated_*` stamps go on saying who last changed it.
  for (const { step, row, place } of moves) {
    const columns = stepColumns(step, place);
    if (unchanged(columns, row)) continue;
    await write.updateById(spellSteps, row.id, columns);
  }

  for (const [index, step] of steps.entries()) {
    if (step.id != null) continue;
    await write.insert(spellSteps, { ...stepColumns(step, index + 1), spellId });
  }
}

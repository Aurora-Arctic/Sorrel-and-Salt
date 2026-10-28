import { z } from 'zod';
import { requiredText } from '../../../lib/validation';
import { MAX_QUANTITY } from '../../ingredients/schema/quantities';
import { UNITS } from '../../ingredients/schema/units';

// One step of a spell's recipe, as the builder and the mutation both read it.
// It mirrors spell_steps' CHECKs (src/modules/grimoire/schema/spell-steps.ts)
// one for one, so the database refuses nothing a user could have been told
// about here. The CHECK each rule mirrors is named beside it.

// Not a CHECK: a negative amount says something, so it is said here, in the
// words the stock schema uses (claude-docs/db/stock.md).
const quantity = z
  .number({ error: 'Quantity must be a number' })
  .nonnegative({ error: 'Quantity cannot be negative' })
  .max(MAX_QUANTITY, {
    error: `Quantity is too large — the most it can be is ${MAX_QUANTITY.toLocaleString('en', { maximumFractionDigits: 3 })}`,
  });

// A present-but-blank field is refused (the *_not_blank CHECKs), unlike
// `optionalText`, which reads blank as absent: a step with a blank
// instruction is a mistake, not an empty field.
const present = (message: string) => requiredText(message).nullish();

export const SpellStepInput = z
  .object({
    // The step this one is, on an update: kept where it is given, a new step
    // where it is absent, and a saved step left out of the list is removed
    // (claude-docs/db/grimoire.md, "Saving a recipe").
    id: z.guid({ error: 'This step is not one of the spell’s' }).nullish(),
    // What to do at this step.
    body: present('Write the instruction, or remove it'),
    // A linked ingredient and the form of it laid, or a name written for this
    // jar and its form.
    ingredientId: z.guid({ error: 'Choose an ingredient from the list' }).nullish(),
    variantId: z.guid({ error: 'Choose a form from the list' }).nullish(),
    name: present('Give the ingredient a name'),
    form: present('Give the form a name, or remove it'),
    quantity: quantity.nullish(),
    // The units module's list, never a second one here.
    unit: z.enum(UNITS, { error: 'Choose a unit from the list' }).nullish(),
  })
  .superRefine((step, context) => {
    const hasIngredient = step.ingredientId != null;
    const hasName = step.name != null;
    const hasIdentity = hasIngredient || hasName;

    // spell_steps_not_empty
    if (!hasIdentity && step.body == null) {
      context.addIssue({
        code: 'custom',
        message: 'Write an instruction or add an ingredient',
      });
    }
    // spell_steps_one_identity
    if (hasIngredient && hasName) {
      context.addIssue({
        code: 'custom',
        path: ['name'],
        message: 'Choose an ingredient or write a name, not both',
      });
    }
    // spell_steps_variant_with_ingredient: a form id exactly when an id is linked.
    if (hasIngredient !== (step.variantId != null)) {
      context.addIssue({
        code: 'custom',
        path: ['variantId'],
        message: hasIngredient
          ? 'Choose which form of the ingredient'
          : 'A form can only be chosen for a linked ingredient',
      });
    }
    // spell_steps_form_only_on_custom
    if (hasIngredient && step.form != null) {
      context.addIssue({
        code: 'custom',
        path: ['form'],
        message: 'A linked ingredient already names its form',
      });
    }
    // spell_steps_amount_on_ingredient
    if (!hasIdentity) {
      for (const field of ['quantity', 'unit'] as const) {
        if (step[field] != null) {
          context.addIssue({
            code: 'custom',
            path: [field],
            message: 'An amount belongs to an ingredient, so add one or remove this',
          });
        }
      }
    }
  });

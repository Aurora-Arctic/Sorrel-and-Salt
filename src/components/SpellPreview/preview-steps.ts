import { formLabel } from '../../modules/ingredients/validation/form-label';
import type { RecipeStep } from '../SpellRecipe/types';
import type { PreviewStep } from './types';

/**
 * The recipe's steps cut down to what the preview pane draws: the label, the amount and the text.
 * Done on the server so the pane's props carry no Quick Look links, safety or stock verdicts.
 */
export const previewStepsOf = (steps: readonly RecipeStep[]): PreviewStep[] =>
  steps.map((step) =>
    step.kind === 'instruction'
      ? { kind: 'instruction', id: step.id, body: step.body }
      : {
          kind: 'ingredient',
          id: step.id,
          name: step.form ? `${step.name} (${formLabel(step.form)})` : step.name,
          quantity: step.quantity,
          unit: step.unit,
          body: step.body,
        },
  );

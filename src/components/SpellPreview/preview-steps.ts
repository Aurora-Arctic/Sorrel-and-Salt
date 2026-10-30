import type { RecipeStep } from '../SpellRecipe/types';

/**
 * The recipe's steps with what the preview pane leaves out taken off: the Quick Look link, the
 * safety marks and the stock verdict. Done on the server so the pane's props never carry them.
 */
export const previewStepsOf = (steps: readonly RecipeStep[]): RecipeStep[] =>
  steps.map((step) =>
    step.kind === 'instruction' ? step : { ...step, look: null, safety: null, supply: null },
  );

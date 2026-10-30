import type { SpellRecipeBodyProps } from '../SpellRecipe/types';

/**
 * What the pane draws: the printed spell's body, as the recipe page gives it, with the steps cut
 * down by `previewStepsOf`. The title is always set, as the page names an untitled spell.
 */
export type SpellPreviewProps = SpellRecipeBodyProps & {
  /** The spell's name as the page shows it. */
  title: string;
};

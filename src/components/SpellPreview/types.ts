import type { SpellRecipeBodyProps } from '../SpellRecipe/types';

/**
 * What the pane draws: the printed spell's body, as the recipe page gives it, with the steps cut
 * down by `previewStepsOf`. The title is always set, as the page names an untitled spell.
 */
export type SpellPreviewProps = SpellRecipeBodyProps & {
  /** The spell's name as the page shows it. */
  title: string;
};

/** One ember behind the pane: a glowing fragment (`hot`) or a flake of ash. Units in `embers.ts`. */
export type Ember = {
  kind: 'hot' | 'ash';
  /** Where it starts: across the bottom edge from the left, or in from the right and bottom. */
  x?: number;
  right?: number;
  bottom?: number;
  w: number;
  h: number;
  br: string;
  d: number;
  delay: number;
  sway: number;
};

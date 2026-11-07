import type { SpellRecipeBodyProps } from '../SpellRecipe/types';

export type SpellPreviewProps = SpellRecipeBodyProps & {
  title: string;
  demoNotice?: string;
};

export type Ember = {
  kind: 'hot' | 'ash';
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

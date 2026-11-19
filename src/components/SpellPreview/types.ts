import type { SpellRecipeBodyProps } from '../SpellRecipe/types';

export type SpellPreviewProps = SpellRecipeBodyProps & {
  title: string;
  demoNotice?: string;
};

export type Ember = {
  kind: 'hot' | 'ash';
  shape: 0 | 1 | 2 | 3;
  x?: number;
  right?: number;
  bottom?: number;
  w: number;
  h: number;
  d: number;
  delay: number;
  sway: number;
};

export type Fleck = {
  right: number;
  bottom: number;
  w: number;
  h: number;
  peak: number;
  d: number;
  delay: number;
};

export type Heat = {
  right: number;
  bottom: number;
  delay: number;
};

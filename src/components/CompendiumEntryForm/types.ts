import type { SourcingScore } from '@/modules/ingredients';
import type { IngredientFormProps } from '../IngredientForm/types';

/** The form's props bar what this component fixes for the compendium: the tier, the promote right and the Sources intro. */
export type CompendiumEntryFormProps = Omit<
  Extract<IngredientFormProps, { workspaceId: null }>,
  'workspaceId' | 'mayPromote' | 'sourcesIntro'
> & {
  /** The entry's sourcing score, shown at the head of Sources; left out or null, no panel. */
  sourcing?: SourcingScore | null;
};

import type { SourcingScore } from '@/modules/ingredients';
import type { IngredientFormProps } from '../IngredientForm/types';

export type CompendiumEntryFormProps = Omit<
  Extract<IngredientFormProps, { workspaceId: null }>,
  'workspaceId' | 'mayPromote' | 'sourcesIntro'
> & {
  sourcing?: SourcingScore | null;
};

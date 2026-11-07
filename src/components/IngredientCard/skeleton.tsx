import { IngredientCardFrame, type IngredientCardKind } from './frame';

// An ingredient card with nothing in it yet: the card's own frame, filled by one shimmering block, at
// the height of the list it stands in (the coven's cupboard or the compendium).
export const IngredientCardSkeleton = ({ kind = 'cupboard' }: { kind?: IngredientCardKind }) => (
  <IngredientCardFrame skeleton={kind} />
);

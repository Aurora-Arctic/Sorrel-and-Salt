import Skeleton from '../Skeleton';
import { IngredientCardFrame } from './frame';

// An ingredient card with nothing in it yet: the card's own frame, with bars where its name, its
// formal name and its categories go.
export const IngredientCardSkeleton = () => (
  <IngredientCardFrame>
    <Skeleton shape="line" count={3} quiet />
  </IngredientCardFrame>
);

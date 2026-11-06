import Skeleton from '../Skeleton';
import { SpellCardFrame } from './frame';

// A spell card with nothing in it yet: the card's own frame, with bars where its name and its
// edited line go.
export const SpellCardSkeleton = () => (
  <SpellCardFrame>
    <Skeleton shape="line" count={2} quiet />
  </SpellCardFrame>
);

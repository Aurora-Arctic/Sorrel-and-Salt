import Skeleton from '../Skeleton';
import { SpellCardFrame } from './frame';

// A spell card with nothing in it yet: the card's own frame, with bars where its name, its intent
// and its edited line go, and a block where the actions row goes, so it stands as tall as the card.
export const SpellCardSkeleton = () => (
  <SpellCardFrame>
    <Skeleton shape="line" count={3} quiet />
    <Skeleton shape="block" quiet />
  </SpellCardFrame>
);

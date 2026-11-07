import Skeleton from '../Skeleton';
import { SpellCardFrame } from './frame';

// A spell card with nothing in it yet: the card's own frame, with bars where its name, its intent,
// its edited line and its actions row go, so it stands as tall as the card.
export const SpellCardSkeleton = () => (
  <SpellCardFrame>
    <Skeleton shape="line" count={4} quiet />
  </SpellCardFrame>
);

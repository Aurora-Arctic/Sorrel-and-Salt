import Skeleton from '../Skeleton';
import { SpellCardFrame } from './frame';

// A spell card with nothing in it yet: the card's own frame, with five bars where its name, its intent,
// its edited line and its actions go. The frame's padding follows the list's density as the card's does;
// the bars' spacing is in SpellCard/index.scss.
export const SpellCardSkeleton = () => (
  <SpellCardFrame>
    <Skeleton shape="line" count={5} quiet />
  </SpellCardFrame>
);

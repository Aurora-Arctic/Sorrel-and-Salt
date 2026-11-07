import { SpellCardFrame } from './frame';

// A spell card with nothing in it yet: the card's own frame, filled by one shimmering block.
// A draft card is taller than a complete one: its status badge takes a line of its own.
export const SpellCardSkeleton = ({ draft = false }: { draft?: boolean }) => (
  <SpellCardFrame skeleton={draft ? 'spell-draft' : 'spell'} />
);

import type { ReactNode } from 'react';

/** A row's class, which names the row's styles (`about-pillars`, `about-roles`). */
type AboutCardsBlock = 'about-pillars' | 'about-roles';

interface AboutCard {
  heading: string;
  text: string;
  /** A drawing from `IconTip/icons.tsx`; decorative, so it is hidden from a screen reader. */
  icon?: ReactNode;
  /** A label above the heading, drawn as an eyebrow beside the icon. A card with none has its icon beside its heading. */
  kicker?: string;
  /** The card's hue, as the row's styles read it from `data-accent`. */
  accent?: string;
}

export interface AboutCardsProps {
  block: AboutCardsBlock;
  cards: readonly AboutCard[];
  /** The quiet card primitive's edge and wash, which the pillars take and the roles leave out. */
  quiet?: boolean;
}

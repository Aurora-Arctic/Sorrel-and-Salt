import type { ReactNode } from 'react';

/** Which hue a pillar card wears: the site accent, or one of the three decorative hues (`--clay`, `--sloe`, `--woad`). */
type AboutPillarAccent = 'accent' | 'clay' | 'sloe' | 'woad';

export interface AboutPillar {
  /** What the pillar is called on the site, such as "The Compendium". */
  kicker: string;
  /** What the pillar answers, such as "What Exists". Title Case. */
  heading: string;
  text: string;
  /** A drawing from `IconTip/icons.tsx`, shown beside the kicker; decorative, so it is hidden from a screen reader. */
  icon?: ReactNode;
  /** The card's hue: its top rule, kicker and icon. The quiet ink where left out. */
  accent?: AboutPillarAccent;
}

export interface AboutPillarsProps {
  pillars: readonly AboutPillar[];
}

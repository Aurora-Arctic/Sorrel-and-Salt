import type { SpellStatus, SpellVisibility } from '@/modules/grimoire';

export interface SpellMarksProps {
  /** A draft is marked Draft; complete is the default and carries no badge. */
  status: SpellStatus;
  /** A private spell or working is marked Private; shared with the coven is the default. */
  visibility: SpellVisibility;
}

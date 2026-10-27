import type { MOON_PHASES } from '../SpellBuilder/constants';

/** One of the builder's eight moon phases. */
export type MoonPhase = (typeof MOON_PHASES)[number];

export interface MoonPhaseIconProps {
  /**
   * The phase as the spell's field holds it: free text, so a value outside
   * the eight ("Dark") draws nothing rather than a guess.
   */
  phase: string;
  /** A layout class from the caller, added after the icon's own. */
  className?: string;
}

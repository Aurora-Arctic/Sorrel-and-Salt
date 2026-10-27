import type { MOON_PHASES } from '../SpellBuilder/constants';

/** One of the builder's moon phases. */
export type MoonPhase = (typeof MOON_PHASES)[number];

/**
 * A phase with a drawing. Waxing Moon and Waning Moon, the cycle's two
 * halves, have none yet: their drawings wait on the owner's pick.
 */
export type DrawnMoonPhase = Exclude<MoonPhase, 'Waxing Moon' | 'Waning Moon'>;

export interface MoonPhaseIconProps {
  /**
   * The phase as the spell's field holds it: free text, so a value with no
   * drawing ("Dark", or Waxing Moon for now) draws nothing rather than a guess.
   */
  phase: string;
  /** A layout class from the caller, added after the icon's own. */
  className?: string;
}

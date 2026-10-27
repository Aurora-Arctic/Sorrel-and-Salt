import type { MOON_PHASES } from '../SpellBuilder/constants';

/** One of the builder's moon phases. */
export type MoonPhase = (typeof MOON_PHASES)[number];

/** The cycle's two halves, each drawn as its three lit phases stacked. */
export type HalfMoonPhase = 'Waxing Moon' | 'Waning Moon';

/** A phase drawn as one lit part, or none. */
export type SingleMoonPhase = Exclude<MoonPhase, HalfMoonPhase>;

/** One lit part of a half's drawing: whose shape, and its strength. */
export type MoonLayer = readonly [phase: SingleMoonPhase, opacity: number];

export interface MoonPhaseIconProps {
  /**
   * The phase as the spell's field holds it: free text, so a value with no
   * drawing ("Dark") draws nothing rather than a guess.
   */
  phase: string;
  /** A layout class from the caller, added after the icon's own. */
  className?: string;
}

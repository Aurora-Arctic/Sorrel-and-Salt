import type { MOON_PHASES } from '../SpellBuilder/constants';

export type MoonPhase = (typeof MOON_PHASES)[number];

export type HalfMoonPhase = 'Waxing Moon' | 'Waning Moon';

export type SingleMoonPhase = Exclude<MoonPhase, HalfMoonPhase>;

export type MoonLayer = readonly [phase: SingleMoonPhase, opacity: number];

export interface MoonPhaseIconProps {
  /**
   * The phase as the spell's field holds it: free text, so a value with no
   * drawing ("Dark") draws nothing rather than a guess.
   */
  phase: string;
  className?: string;
}

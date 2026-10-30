import type { ReactElement } from 'react';
import MoonPhaseIcon from '../MoonPhaseIcon';
import { MOON_PHASES } from './constants';

// A moon phase's drawing, null for a phase typed outside the list. Matched ignoring case and
// surrounding spaces, as the grimoire filter groups free-text phases; shared with its Moon Phase
// facet.
export const moonPhaseIcon = (phase: string): ReactElement | null => {
  const wanted = phase.trim().toLowerCase();
  const known = MOON_PHASES.find((name) => name.toLowerCase() === wanted);
  return known ? <MoonPhaseIcon phase={known} /> : null;
};

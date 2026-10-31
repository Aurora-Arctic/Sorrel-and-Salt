import type { ReactElement } from 'react';
import { MOON_PHASES } from '../SpellBuilder/constants';
import MoonPhaseIcon from '.';

// A moon phase's drawing, null for a phase typed outside the list. Matched ignoring case and
// surrounding spaces, as the grimoire filter groups free-text phases; the builder's Moon Phase
// field and the filter's Moon Phase facet both draw from it.
export const moonPhaseIcon = (phase: string): ReactElement | null => {
  const wanted = phase.trim().toLowerCase();
  const known = MOON_PHASES.find((name) => name.toLowerCase() === wanted);
  return known ? <MoonPhaseIcon phase={known} /> : null;
};

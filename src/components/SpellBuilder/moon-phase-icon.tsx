import type { ReactElement } from 'react';
import MoonPhaseIcon from '../MoonPhaseIcon';
import { MOON_PHASES } from './constants';

// A moon phase's drawing beside its name, null for a phase typed outside the
// list so the box draws no empty mark. Matched ignoring case and surrounding
// spaces, since the grimoire filter groups spells' free-text phases that way
// and shows the most common spelling. Shared by the spell builder's field and
// the grimoire filter's Moon Phase facet.
export const moonPhaseIcon = (phase: string): ReactElement | null => {
  const wanted = phase.trim().toLowerCase();
  const known = MOON_PHASES.find((name) => name.toLowerCase() === wanted);
  return known ? <MoonPhaseIcon phase={known} /> : null;
};

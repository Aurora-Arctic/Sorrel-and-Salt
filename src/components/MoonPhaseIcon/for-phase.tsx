import { fold } from '@/lib/text';
import type { ReactElement } from 'react';
import { MOON_PHASES } from '../SpellBuilder/constants';
import MoonPhaseIcon from '.';

// Null for a phase outside the list. Matched ignoring case and surrounding spaces, as the
// grimoire filter groups free-text phases.
export const moonPhaseIcon = (phase: string): ReactElement | null => {
  const wanted = fold(phase);
  const known = MOON_PHASES.find((name) => fold(name) === wanted);
  return known ? <MoonPhaseIcon phase={known} /> : null;
};

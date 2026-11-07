import type { ReactElement } from 'react';
import { MOON_PHASES } from '../SpellBuilder/constants';
import MoonPhaseIcon from '.';

export const moonPhaseIcon = (phase: string): ReactElement | null => {
  const wanted = phase.trim().toLowerCase();
  const known = MOON_PHASES.find((name) => name.toLowerCase() === wanted);
  return known ? <MoonPhaseIcon phase={known} /> : null;
};

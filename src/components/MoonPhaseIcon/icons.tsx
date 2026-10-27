import type { ReactElement } from 'react';
import type { MoonPhase } from './types';

// The lit part of the moon in each phase, on a disc of radius 8 centred on
// (12, 12). Drawn for the northern hemisphere, where a waxing moon is lit on
// its right and a waning one on its left; in the southern hemisphere the
// sides swap. Each crescent and gibbous edge is the half-ellipse from the top
// of the disc (12, 4) to its foot (12, 20), 4.5 wide. New Moon has no lit
// part, so it is the shaded disc alone.
export const LIT_PARTS: Record<MoonPhase, ReactElement | null> = {
  'New Moon': null,
  'Waxing Crescent': <path d="M12 4A8 8 0 0 1 12 20A4.5 8 0 0 0 12 4Z" />,
  'First Quarter': <path d="M12 4A8 8 0 0 1 12 20Z" />,
  'Waxing Gibbous': <path d="M12 4A8 8 0 0 1 12 20A4.5 8 0 0 1 12 4Z" />,
  'Full Moon': <circle cx="12" cy="12" r="8" />,
  'Waning Gibbous': <path d="M12 4A8 8 0 0 0 12 20A4.5 8 0 0 0 12 4Z" />,
  'Last Quarter': <path d="M12 4A8 8 0 0 0 12 20Z" />,
  'Waning Crescent': <path d="M12 4A8 8 0 0 0 12 20A4.5 8 0 0 1 12 4Z" />,
};

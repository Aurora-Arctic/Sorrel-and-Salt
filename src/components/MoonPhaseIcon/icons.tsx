import type { ReactElement } from 'react';
import type { HalfMoonPhase, MoonLayer, SingleMoonPhase } from './types';

// The lit part of each phase; the drawing rules are in claude-docs/components/moon-phase-icon.md,
// "Lit parts". New Moon and Dark Moon have no lit part (index.tsx).
export const LIT_PARTS: Record<SingleMoonPhase, ReactElement | null> = {
  'New Moon': null,
  'Dark Moon': null,
  'Waxing Crescent': <path d="M12 4A8 8 0 0 1 12 20A4.5 8 0 0 0 12 4Z" />,
  'First Quarter': <path d="M12 4A8 8 0 0 1 12 20Z" />,
  'Waxing Gibbous': <path d="M12 4A8 8 0 0 1 12 20A4.5 8 0 0 1 12 4Z" />,
  'Full Moon': <circle cx="12" cy="12" r="8" />,
  'Waning Gibbous': <path d="M12 4A8 8 0 0 0 12 20A4.5 8 0 0 0 12 4Z" />,
  'Last Quarter': <path d="M12 4A8 8 0 0 0 12 20Z" />,
  'Waning Crescent': <path d="M12 4A8 8 0 0 0 12 20A4.5 8 0 0 1 12 4Z" />,
};

// The cycle's two halves, each its three lit phases laid over one another, bottom to top: the
// gibbous faintest and the crescent at full strength, so the light reads as spreading from the
// side it grows from (claude-docs/components/moon-phase-icon.md, "Lit parts").
export const HALVES: Record<HalfMoonPhase, readonly MoonLayer[]> = {
  'Waxing Moon': [
    ['Waxing Gibbous', 0.25],
    ['First Quarter', 0.4],
    ['Waxing Crescent', 1],
  ],
  'Waning Moon': [
    ['Waning Gibbous', 0.25],
    ['Last Quarter', 0.4],
    ['Waning Crescent', 1],
  ],
};

/*
 * The near side's seven largest maria, each an ellipse placed from its published centre and
 * diameter. The figures, their source and the projection are in
 * claude-docs/components/moon-phase-icon.md, "Maria".
 */
export const MARIA: ReactElement = (
  <>
    <ellipse cx="5.75" cy="9.18" rx="3.07" ry="5.97" transform="rotate(-155.7 5.75 9.18)" />
    <ellipse cx="10.31" cy="7.44" rx="2.09" ry="2.64" transform="rotate(-110.37 10.31 7.44)" />
    <ellipse cx="14.24" cy="8.33" rx="1.31" ry="1.55" transform="rotate(-58.59 14.24 8.33)" />
    <ellipse cx="16.06" cy="10.84" rx="1.71" ry="2.02" transform="rotate(-15.98 16.06 10.84)" />
    <ellipse cx="18.59" cy="9.77" rx="0.63" ry="1.28" transform="rotate(-18.68 18.59 9.77)" />
    <ellipse cx="18.38" cy="13.09" rx="1.14" ry="1.93" transform="rotate(9.69 18.38 13.09)" />
    <ellipse cx="9.77" cy="14.81" rx="1.47" ry="1.64" transform="rotate(128.35 9.77 14.81)" />
  </>
);

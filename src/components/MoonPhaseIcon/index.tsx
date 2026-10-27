import { type ReactElement, useId } from 'react';
import { HALVES, LIT_PARTS, MARIA } from './icons';
import type { MoonLayer, MoonPhaseIconProps } from './types';
import './index.scss';

// The small drawing of the moon beside a moon phase's name in the spell
// builder: on FormIcon's 24-unit square. Its fills are three theme tokens
// rather than `currentColor`, so the lit part is the paler of the two in
// either theme (the owner, 2026-10-27): the shadowed disc, the lit part, and
// the maria clipped to the lit part. The outline is the text's ink. Dark
// Moon is the outline alone, with no shadowed disc, so it reads apart from
// New Moon (the owner, 2026-10-27). Waxing Moon and Waning Moon stack their
// half's three lit parts at rising strength, the crescent at full (icons.tsx, HALVES). Hidden from assistive technology, since
// the phase's name always stands beside it.
// claude-docs/components/spell-builder.md, "The fields".

const MoonPhaseIcon = ({ phase, className }: MoonPhaseIconProps): ReactElement | null => {
  // An id per icon, so two on one page clip each to its own lit part; a
  // half's layers add their index to it.
  const clipId = useId();
  // Own-property checks rather than an index: the field is free text, and a
  // phase with no drawing draws nothing.
  const has = (table: object): boolean => Object.prototype.hasOwnProperty.call(table, phase);
  let layers: readonly MoonLayer[];
  if (has(HALVES)) layers = HALVES[phase as keyof typeof HALVES];
  else if (has(LIT_PARTS)) {
    const single = phase as keyof typeof LIT_PARTS;
    layers = LIT_PARTS[single] ? [[single, 1]] : [];
  } else return null;
  const shadowed = phase !== 'Dark Moon';
  return (
    <svg
      className={className ? `moon-phase-icon ${className}` : 'moon-phase-icon'}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {shadowed && <circle className="moon-phase-icon__shadow" cx="12" cy="12" r="8" />}
      {layers.map(([shape, opacity], i) => {
        const lit = LIT_PARTS[shape];
        const id = `${clipId}-${i}`;
        // A full-strength layer leaves fill-opacity unset, as a single phase
        // draws it.
        const fillOpacity = opacity === 1 ? undefined : opacity;
        return (
          <g key={shape}>
            <clipPath id={id}>{lit}</clipPath>
            <g className="moon-phase-icon__lit" fillOpacity={fillOpacity}>
              {lit}
            </g>
            <g
              className="moon-phase-icon__maria"
              clipPath={`url(#${id})`}
              fillOpacity={fillOpacity}
            >
              {MARIA}
            </g>
          </g>
        );
      })}
      {/* Last, over the lit part and the maria: thin and half-strength in
          the text's ink, so the lit part's own edge is the shape seen (the
          owner, 2026-10-27). */}
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />
    </svg>
  );
};

export default MoonPhaseIcon;

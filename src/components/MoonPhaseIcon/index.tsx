import { type ReactElement, useId } from 'react';
import { LIT_PARTS, MARIA } from './icons';
import type { MoonPhaseIconProps } from './types';
import './index.scss';

// The small drawing of the moon beside a moon phase's name in the spell
// builder: on FormIcon's 24-unit square. Its fills are three theme tokens
// rather than `currentColor`, so the lit part is the paler of the two in
// either theme (the owner, 2026-10-27): the shadowed disc, the lit part, and
// the maria clipped to the lit part. The outline is the text's ink. Hidden from assistive technology, since the phase's name always
// stands beside it. claude-docs/components/spell-builder.md, "The fields".

const MoonPhaseIcon = ({ phase, className }: MoonPhaseIconProps): ReactElement | null => {
  // An id per icon, so two on one page clip each to its own lit part.
  const clipId = useId();
  // An own-property check rather than an index: the field is free text, and a
  // phase outside the eight draws nothing.
  if (!Object.prototype.hasOwnProperty.call(LIT_PARTS, phase)) return null;
  const lit = LIT_PARTS[phase as keyof typeof LIT_PARTS];
  return (
    <svg
      className={className ? `moon-phase-icon ${className}` : 'moon-phase-icon'}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle className="moon-phase-icon__shadow" cx="12" cy="12" r="8" />
      {lit && (
        <>
          <clipPath id={clipId}>{lit}</clipPath>
          <g className="moon-phase-icon__lit">{lit}</g>
          <g className="moon-phase-icon__maria" clipPath={`url(#${clipId})`}>
            {MARIA}
          </g>
        </>
      )}
      {/* Last, over the lit part and the maria: thin and half-strength in
          the text's ink, so the lit part's own edge is the shape seen (the
          owner, 2026-10-27). */}
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />
    </svg>
  );
};

export default MoonPhaseIcon;

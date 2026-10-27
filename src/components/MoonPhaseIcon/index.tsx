import type { ReactElement } from 'react';
import { LIT_PARTS } from './icons';
import type { MoonPhaseIconProps } from './types';
import './index.scss';

// The small drawing of the moon beside a moon phase's name in the spell
// builder: on FormIcon's conventions, a 24-unit square, a 1.6 stroke with
// round ends, every colour `currentColor`, so it takes the text's ink in
// either theme with no colour of its own. The lit part is solid ink and the
// shadowed part the same ink at a fifth, so the two stay apart in both
// themes. Hidden from assistive technology, since the phase's name always
// stands beside it. claude-docs/components/spell-builder.md, "The fields".

const MoonPhaseIcon = ({ phase, className }: MoonPhaseIconProps): ReactElement | null => {
  // An own-property check rather than an index: the field is free text, and a
  // phase outside the eight draws nothing.
  if (!Object.prototype.hasOwnProperty.call(LIT_PARTS, phase)) return null;
  const lit = LIT_PARTS[phase as keyof typeof LIT_PARTS];
  return (
    <svg
      className={className ? `moon-phase-icon ${className}` : 'moon-phase-icon'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="8" fill="currentColor" fillOpacity="0.2" stroke="none" />
      {lit && (
        <g fill="currentColor" stroke="none">
          {lit}
        </g>
      )}
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
};

export default MoonPhaseIcon;

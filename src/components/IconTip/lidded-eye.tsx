import { type ReactElement, useId } from 'react';
import type { LiddedEyeIconProps } from './types';
import './lidded-eye.scss';

// The open and shut upper lids of the mystic eye's 16-unit grid, and the lower lid that closes the
// gap the iris shows through; lidded-eye.scss carries the same shapes to move between them.
const LID_OPEN = 'M1 8C2.8 5 5.2 3.5 8 3.5S13.2 5 15 8';
const LID_SHUT = 'M1 8C2.8 11 5.2 12.5 8 12.5S13.2 11 15 8';
const LOWER_LID = 'C13.2 11 10.8 12.5 8 12.5S2.8 11 1 8z';

/** The mystic eye with a lid: open, it is the Quick Look eye; shut, the upper lid lies on the lower and lashes hang from it. The lid moves between the two. */
export function LiddedEyeIcon({ open, className }: LiddedEyeIconProps): ReactElement {
  const clipId = useId();
  const lid = open ? LID_OPEN : LID_SHUT;
  return (
    <svg
      className={['lidded-eye', open && 'lidded-eye--open', className].filter(Boolean).join(' ')}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="translate(0.25 0)">
        <defs>
          <clipPath id={clipId}>
            <path className="lidded-eye__gap" d={lid + LOWER_LID} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`} fill="currentColor" stroke="none">
          <path d="M6.1 5.75A2.7 2.7 0 1 0 9.09 10.01A2.7 2.7 0 0 1 6.1 5.75z" />
          <path d="M9.6 5.15L10.1 6.05L11 6.55L10.1 7.05L9.6 7.95L9.1 7.05L8.2 6.55L9.1 6.05z" />
        </g>
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={LID_SHUT} />
          <path className="lidded-eye__lid" d={lid} />
          <path
            className="lidded-eye__lashes"
            strokeWidth="0.8"
            d="M3.1 10.6L2.2 11.6M4.84 11.78L4.3 13.1M6.37 12.32L6.1 13.8M8 12.5V14.1M9.63 12.32L9.9 13.8M11.16 11.78L11.7 13.1M12.9 10.6L13.8 11.6"
          />
        </g>
      </g>
    </svg>
  );
}

import type { ReactElement } from 'react';
import './index.scss';

// Two fixed corner ornaments (sorrel top-left, salt bowl bottom-right), each two sibling layers, one per blend mode,
// cross-faded by the theme; decorative, hidden from assistive technology, never in the pointer's way
// (claude-docs/components/backdrop.md, "Stacking").

const CORNERS = ['sorrel', 'salt'] as const;
const BLENDS = ['screen', 'multiply'] as const;

const Backdrop = (): ReactElement => (
  <>
    {CORNERS.flatMap((corner) =>
      BLENDS.map((blend) => (
        <div
          key={`${corner}-${blend}`}
          className={`backdrop backdrop--${corner} backdrop--${blend}`}
          aria-hidden="true"
        />
      )),
    )}
  </>
);

export default Backdrop;

import type { ReactElement } from 'react';
import './index.scss';

// Two fixed ornaments, one in each of two corners of every page — sorrel
// leaves top-left, a salt bowl and spoon bottom-right — grey photographs
// blended into the page surface. Each corner is two sibling layers, one per
// blend mode, cross-faded by the theme: a blend mode cannot animate, opacity
// can, and a layer nested inside the other would blend with its parent rather
// than the page (claude-docs/components/backdrop.md, "Stacking"). Purely
// decorative, so hidden from assistive technology and never in the way of a
// pointer.

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

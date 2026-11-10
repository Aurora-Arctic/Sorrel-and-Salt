import type { CSSProperties } from 'react';
import type { GroupColors } from './types';

/** Both colours, which `chip()` picks between by theme, so a toggle re-colours without a render (claude-docs/styling.md, "Chips, badges and the solid-fill rule"). */
export function chipColors({ colorDark, colorLight }: GroupColors): CSSProperties {
  // React's `CSSProperties` types no custom property.
  return { '--chip-dark': colorDark, '--chip-light': colorLight } as CSSProperties;
}

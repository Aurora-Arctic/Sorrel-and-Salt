import type { ReactElement } from 'react';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';

// The form icons, on the section nav's conventions: a 24-unit square, a 1.6 stroke with round ends, no
// fill, in `currentColor` (claude-docs/components/form-icon.md, "The icons").
/**
 * Scales a drawing about (12, 12), the stroke scaled back to 1.6; the sprig and drop are drawn smaller,
 * so each scale matches the others' area.
 */
const sized = (scale: number, cx: number, cy: number, shape: ReactElement): ReactElement => (
  <g
    transform={`translate(12 12) scale(${scale}) translate(${-cx} ${-cy})`}
    strokeWidth={1.6 / scale}
  >
    {shape}
  </g>
);

export const FORM_SHAPES: Record<FormGroupIcon, ReactElement> = {
  // Drawn 13 by 15, centred on (12, 13).
  botanical: sized(
    1.16,
    12,
    13,
    <>
      <path d="M12 20.5V6" />
      <path d="M12 15C8.3 15 5.8 12.8 5.5 9C9.2 9 11.7 11.2 12 15z" />
      <path d="M12 11.5C15.7 11.5 18.2 9.3 18.5 5.5C14.8 5.5 12.3 7.7 12 11.5z" />
    </>,
  ),
  // Drawn 16.6 by 16, centred on (12, 12); a shade under the gem by eye.
  animal: sized(
    1.05,
    12,
    12,
    <>
      <path d="M12 20c-3.3 0-5.3-1.7-5.3-3.8 0-1.9 1.6-2.6 2.6-3.9.8-1 1.4-2.1 2.7-2.1s1.9 1.1 2.7 2.1c1 1.3 2.6 2 2.6 3.9 0 2.1-2 3.8-5.3 3.8z" />
      <ellipse cx="6" cy="10.5" rx="1.5" ry="2.1" transform="rotate(-28 6 10.5)" />
      <ellipse cx="9.6" cy="6.3" rx="1.5" ry="2.1" transform="rotate(-10 9.6 6.3)" />
      <ellipse cx="14.4" cy="6.3" rx="1.5" ry="2.1" transform="rotate(10 14.4 6.3)" />
      <ellipse cx="18" cy="10.5" rx="1.5" ry="2.1" transform="rotate(28 18 10.5)" />
    </>,
  ),
  mineral: (
    <>
      <path d="M8 4.5h8l4.5 5.5L12 20 3.5 10z" />
      <path d="M3.5 10h17M8 4.5l4 5.5 4-5.5M12 10v10" />
    </>
  ),
  // The pestle is the set's one filled shape: a solid club, so it reads as stone and not
  // a stick, whose foot runs along the rim so the bowl's front wall cuts it off. Drawn
  // before the bowl, so the rim's stroke lies over its foot.
  substance: (
    <>
      <path fill="currentColor" d="M12.6 10.5L18.1 3.9a.7 .7 0 0 1 1.12 .84L15.2 10.5z" />
      <path d="M3.5 10.5h17v1.5a7 7 0 0 1-7 7h-3a7 7 0 0 1-7-7z" />
    </>
  ),
  // Drawn 12 by 17, centred on (12, 12).
  fluid: sized(
    1.13,
    12,
    12,
    <>
      <path d="M12 3.5c-3 4.5-6 7.7-6 11a6 6 0 0 0 12 0c0-3.3-3-6.5-6-11z" />
      <path d="M9 14.5a3 3 0 0 0 1.6 2.6" />
    </>,
  ),
  // A skeleton key: a three-leaf clover bow, a straight shaft, and a plate bit with a notch between two
  // teeth. Drawn lying flat and turned 45° about the centre, to use the square's diagonal.
  curio: (
    <g transform="rotate(45 12 12)">
      <path d="M5.8 12A2.2 2.2 0 1 0 3.62 10A2.2 2.2 0 1 0 3.62 14A2.2 2.2 0 1 0 5.8 12z" />
      <path d="M5.8 12H23" />
      <path d="M16.8 12v5.2h2v-2.6h2v2.6h2V12" />
    </g>
  ),
};

// The generic: a salt spoon drawn on the Backdrop's `salt-spoon.webp`, also the admin nav's Forms mark
// (claude-docs/design-decisions/m12.6-form-icons.md). Scaled to match the six; each grain is a
// zero-length stroke the round caps swell into a dot.
export const SPOON: ReactElement = (
  <g transform="translate(12 12) scale(1.05) translate(-12.23 -12.23)">
    <ellipse strokeWidth="1.3" cx="8.5" cy="8.5" rx="4.6" ry="3.4" transform="rotate(45 8.5 8.5)" />
    <path
      strokeWidth="1.3"
      d="M12.51 10.11Q13.49 12.29 14.89 14.05Q17.29 16.17 20.12 17.86L21.15 18.61Q22.07 19.53 21.15 20.45L20.45 21.15Q19.53 22.07 18.61 21.15L17.86 20.12Q16.17 17.29 14.05 14.89Q12.29 13.49 10.11 12.51"
    />
    <path strokeWidth="2" d="M7 7h.01M10 8.5h.01M6.5 9.5h.01M8.5 6.5h.01M9 10.5h.01" />
    <path strokeWidth="2" d="M4 15h.01M7 16.5h.01M4.5 19h.01" />
  </g>
);

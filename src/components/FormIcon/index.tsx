import type { ReactElement } from 'react';
import { FORM_SHAPES, SPOON } from './icons';
import type { FormIconProps } from './types';
import './index.scss';

// The small mark beside a form saying what kind of thing it is: its group's icon, or the generic salt
// spoon. Hidden from assistive technology, as the form's name stands beside it. A caller hands over the
// group's icon or `null`, never an icon (claude-docs/components/form-icon.md).

const FormIcon = ({ name, className }: FormIconProps): ReactElement => {
  // An own-property check rather than an index: a name outside the six, from an older
  // client or a later enum value, must draw the generic, not nothing.
  const shape =
    name !== null && Object.prototype.hasOwnProperty.call(FORM_SHAPES, name)
      ? FORM_SHAPES[name]
      : SPOON;
  return (
    <svg
      className={className ? `form-icon ${className}` : 'form-icon'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {shape}
    </svg>
  );
};

export default FormIcon;
export { SPOON } from './icons';

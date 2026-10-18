import type { ReactElement } from 'react';
import { FORM_SHAPES, SPOON } from './icons';
import type { FormIconProps } from './types';
import './index.scss';

// The small mark beside a form saying what kind of thing it is, so a list of
// forms scans before it is read (M12.7): the icon of the form's group, or
// the generic salt spoon where there is none. Hidden from assistive
// technology, since the form's name always stands beside it. The resolution
// is here and nowhere else: a caller hands over the group's icon or `null`,
// never an icon. claude-docs/components/form-icon.md.

const FormIcon = ({ name, className }: FormIconProps): ReactElement => {
  // An own-property check rather than an index: a name outside the six —
  // from an older client, or a value the enum gained after this build — must
  // draw the generic, not nothing.
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

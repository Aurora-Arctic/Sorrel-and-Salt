import type { ReactElement } from 'react';
import Spinner from '../Spinner';
import type { BusyButtonProps } from './types';

// Leaves `disabled` to the caller (claude-docs/components/busy-button.md; claude-docs/styling.md, "Buttons").
const BusyButton = ({
  busy,
  busyLabel,
  busyAriaLabel,
  children,
  type = 'button',
  className = 'btn',
  ...button
}: BusyButtonProps): ReactElement => (
  // A bare `<button>` submits; `type` defaults to `button` so a form's
  // non-submit actions never submit it by accident, and a Save says `submit`.
  <button
    type={type}
    className={className}
    aria-busy={busy || undefined}
    {...button}
    aria-label={busy ? busyAriaLabel : button['aria-label']}
  >
    {busy && <Spinner />}
    {busy ? busyLabel : children}
  </button>
);

export default BusyButton;

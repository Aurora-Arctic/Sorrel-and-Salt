import type { ReactElement } from 'react';
import Spinner from '../Spinner';
import type { BusyButtonProps } from './types';

// A button whose action can be in flight: `aria-busy`, the `.spinner` ahead of the label, and a label
// saying what is happening ("Saving Name"), for every Save (claude-docs/styling.md, "Buttons"). It
// leaves `disabled` to the caller (claude-docs/components/busy-button.md).
const BusyButton = ({
  busy,
  busyLabel,
  children,
  type = 'button',
  className = 'btn',
  ...button
}: BusyButtonProps): ReactElement => (
  // A bare `<button>` submits; `type` defaults to `button` so a form's
  // non-submit actions never submit it by accident, and a Save says `submit`.
  <button type={type} className={className} aria-busy={busy || undefined} {...button}>
    {busy && <Spinner />}
    {busy ? busyLabel : children}
  </button>
);

export default BusyButton;

import type { ReactElement } from 'react';
import Spinner from '../Spinner';
import type { BusyButtonProps } from './types';

// A button whose action can be in flight: `aria-busy`, the `.spinner` ahead
// of the label, and the label saying what is happening ("Saving Name"), the
// owner's call for every Save (M5.6; claude-docs/styling.md, "Buttons").
// Written once because the same three pieces had been copied into
// twenty-three buttons, and one that forgot `aria-busy` looked busy without
// saying so. It leaves `disabled` to the caller: most turn it on while busy,
// but one whose focus must stay (Stop Impersonating) uses `aria-disabled` instead
// (claude-docs/components/busy-button.md).
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

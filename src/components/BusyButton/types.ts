import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface BusyButtonProps extends ComponentPropsWithRef<'button'> {
  busy: boolean;
  busyLabel: ReactNode;
  /** The accessible name while busy, when `aria-label` is set: it must contain the busy label's words (WCAG 2.5.3), as "Adding Google" does "Adding". Without it the name falls back to the busy label. */
  busyAriaLabel?: string;
  children: ReactNode;
}

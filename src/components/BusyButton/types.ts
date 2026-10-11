import type { ComponentPropsWithRef, ReactNode } from 'react';

/** Every button attribute, a ref among them, and the busy state's two. */
export interface BusyButtonProps extends ComponentPropsWithRef<'button'> {
  /** Whether the action is in flight: the spinner shows and the label swaps. */
  busy: boolean;
  /** What is happening while busy, in title case: "Saving Name". */
  busyLabel: ReactNode;
  /** The label while idle: "Save Name". */
  children: ReactNode;
}

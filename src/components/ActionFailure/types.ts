import type { ReactNode } from 'react';

export interface ActionFailureProps {
  /** The controls whose refusals it says, above them all. */
  children: ReactNode;
}

/** What a control inside reaches through `useActionFailure()`. */
export interface ActionFailureReport {
  /** Says the refusal above the controls; `undefined` clears it, as a fresh try should. */
  report: (message: string | undefined) => void;
}

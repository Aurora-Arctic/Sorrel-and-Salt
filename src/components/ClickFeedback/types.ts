import type { ReactNode, RefCallback } from 'react';

/** What `useClickFeedback` is told: the control's name, as the badge's label says it. */
export interface ClickFeedbackOptions {
  /** The control's visible name, as in "Show the error for <name>". */
  name: string;
}

/** What `useClickFeedback` hands back to the control that uses it. */
export interface ClickFeedback {
  /** Goes on the control as `ref`: the callout points at it and the badge sits on it. */
  anchorRef: RefCallback<HTMLElement>;
  /**
   * Shows a failure: the service's sentence in the callout, and the badge on
   * the control. `undefined` clears both, and the control's description.
   */
  report: (message: string | undefined) => void;
  /** Says a sentence in the page's status region; does nothing without one. */
  announce: (text: string) => void;
  /** Rendered directly after the control: the badge, then the callout. */
  feedback: ReactNode;
}

/** The status region's one entry point, from `useAnnounce`. */
export type Announce = (text: string) => void;

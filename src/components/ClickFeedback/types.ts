import type { ReactNode, RefCallback } from 'react';

export interface ClickFeedbackOptions {
  name: string;
}

export interface ClickFeedback {
  anchorRef: RefCallback<HTMLElement>;
  report: (message: string | undefined) => void;
  /** Says a sentence in the page's status region; does nothing without one. */
  announce: (text: string) => void;
  feedback: ReactNode;
}

export type Announce = (text: string) => void;

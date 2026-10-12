import type { ReactNode } from 'react';

export interface InfoTipProps {
  /** The tip's id: a field lists it in `aria-describedby`, so the text is read with the field. */
  id: string;
  /** What the tip is about, naming its button: "About Name". */
  label: string;
  /** The text the tip shows. */
  children: ReactNode;
}

/** A tip's open state and the handlers that move it: what `useTip` returns. */
export interface Tip {
  open: boolean;
  /** Opens it, cancelling a pending close: hover, focus and a tap. */
  show: () => void;
  /** Closes it at once: blur, and Escape. */
  hide: () => void;
  /** Closes it after a moment the pointer can cross onto the tip in: leaving it. */
  hideSoon: () => void;
}

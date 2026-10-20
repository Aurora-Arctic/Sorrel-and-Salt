import type { CSSProperties, ReactNode } from 'react';

export interface InfoTipProps {
  /** The tip's id: a field lists it in `aria-describedby`, so the text is read with the field. */
  id: string;
  /** What the tip is about, naming its button: "About Name". */
  label: string;
  /** The text the tip shows. */
  children: ReactNode;
}

/** How long a hover waits before a tip opens, and a leave before it closes, in ms. */
export interface TipTiming {
  /** 300 by default. */
  openDelayMs?: number;
  /** 150 by default, time to cross onto the tip; 0 closes at once. */
  closeDelayMs?: number;
}

/** A tip's open state and the handlers that move it: what `useTip` returns. */
export interface Tip {
  open: boolean;
  /** Opens it at once, cancelling a pending open or close: focus and a tap. */
  show: () => void;
  /** Opens it once the pointer has rested on the control: hover. */
  showSoon: () => void;
  /** Closes it at once: blur, and Escape. */
  hide: () => void;
  /** Closes it after a moment the pointer can cross onto the tip in: leaving it. */
  hideSoon: () => void;
  /** Ref for the element the bubble belongs to: the wrapper that hears the hover. */
  anchor: (element: HTMLElement | null) => void;
  /** Ref for the bubble. */
  bubble: (element: HTMLElement | null) => void;
  /** The bubble's `style`: where Floating UI has put it, kept on the screen. */
  bubbleStyle: CSSProperties;
}

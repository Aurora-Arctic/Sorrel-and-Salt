import type { CSSProperties, ReactNode } from 'react';

export interface InfoTipProps {
  /** The tip's id: a field lists it in `aria-describedby`, so the text is read with the field. */
  id: string;
  label: string;
  children: ReactNode;
}

interface TipTiming {
  openDelayMs?: number;
  closeDelayMs?: number;
}

export interface TipOptions extends TipTiming {
  /** The element the bubble is placed against when it is not the anchor; `placement` is then used as given. */
  reference?: Element | null;
  /** Anchor to bubble, in pixels. */
  gapPx?: number;
  /** The bubble is as wide as its reference, or this, whichever is wider. */
  minWidthPx?: number;
  /** A press can pin it open (`toggle`), and it stays open while focus is inside its anchor. */
  pinnable?: boolean;
  /** Called after Escape closes it. */
  onEscape?: () => void;
}

export interface Tip {
  open: boolean;
  /** Opens it at once, cancelling a pending open or close: focus and a tap. */
  show: () => void;
  showSoon: () => void;
  hide: () => void;
  hideSoon: () => void;
  /** Pins it open, or closes it if pinned: a press on a pinnable tip's button. */
  toggle: () => void;
  /** Lets go of a pin without closing: focus leaving a pinnable tip. */
  unpin: () => void;
  anchor: (element: HTMLElement | null) => void;
  bubble: (element: HTMLElement | null) => void;
  bubbleStyle: CSSProperties;
}

import type { CSSProperties, ReactNode } from 'react';

export interface InfoTipProps {
  /** The tip's id: a field lists it in `aria-describedby`, so the text is read with the field. */
  id: string;
  label: string;
  children: ReactNode;
}

export interface TipTiming {
  openDelayMs?: number;
  closeDelayMs?: number;
}

export interface Tip {
  open: boolean;
  /** Opens it at once, cancelling a pending open or close: focus and a tap. */
  show: () => void;
  showSoon: () => void;
  hide: () => void;
  hideSoon: () => void;
  anchor: (element: HTMLElement | null) => void;
  bubble: (element: HTMLElement | null) => void;
  bubbleStyle: CSSProperties;
}

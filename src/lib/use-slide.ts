import { type CSSProperties, type TransitionEvent, useEffect, useState } from 'react';

// A section that slides open and shut by height (grid rows, 0fr to 1fr), the Baseline way to animate `auto`. Its content is in the page, whole, throughout, never faded or
// unmounted early. The state stays "closing" until the transition's own end event, so a `<details>` or `<dialog>` keeps its `open`; a longer timer is the net for one that never ran.

/** The slide's length; the same number is the CSS transition, set through `--slide-ms`. */
export const SLIDE_MS = 350;

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

export type SlideState = 'closed' | 'opening' | 'open' | 'closing';

export interface Slide {
  state: SlideState;
  /** True while the section is open or on its way open. */
  shown: boolean;
  open: () => void;
  /** `snap`: no slide, for a modal sheet that has none. */
  close: (snap?: boolean) => void;
  onTransitionEnd: (event: TransitionEvent<HTMLElement>) => void;
  /** The base class, with `<base>--open` added once the rows have grown. */
  className: string;
  style: CSSProperties;
}

export function useSlide(base: string, initial: SlideState = 'closed'): Slide {
  const [state, setState] = useState<SlideState>(initial);
  const reduced = () => window.matchMedia(REDUCED_QUERY).matches;
  const open = () =>
    setState((now) =>
      now === 'open' || now === 'opening'
        ? now
        : reduced() || now === 'closing'
          ? 'open'
          : 'opening',
    );
  const close = (snap = false) =>
    setState((now) => (now === 'closed' ? now : snap || reduced() ? 'closed' : 'closing'));

  useEffect(() => {
    if (state === 'opening') {
      // A frame at 0fr first, so that the opening is a transition.
      let inner = 0;
      const outer = window.requestAnimationFrame(() => {
        inner = window.requestAnimationFrame(() => setState('open'));
      });
      return () => {
        window.cancelAnimationFrame(outer);
        window.cancelAnimationFrame(inner);
      };
    }
    if (state === 'closing') {
      const net = window.setTimeout(() => setState('closed'), SLIDE_MS + 250);
      return () => window.clearTimeout(net);
    }
    return undefined;
  }, [state]);

  return {
    state,
    shown: state === 'open' || state === 'opening',
    open,
    close,
    onTransitionEnd: (event) => {
      if (
        state === 'closing' &&
        event.target === event.currentTarget &&
        event.propertyName === 'grid-template-rows'
      ) {
        setState('closed');
      }
    },
    className: `${base}${state === 'open' ? ` ${base}--open` : ''}`,
    style: { '--slide-ms': `${SLIDE_MS}ms` } as CSSProperties,
  };
}

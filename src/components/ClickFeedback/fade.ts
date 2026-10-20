'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AnimationEvent } from 'react';

// The callout's and the badge's fade out: the piece stays drawn, marked
// closing, until its animation ends, as MenuButton's menu does. Whether it is
// open (`aria-expanded`, the focus going back) never waits for it; only the
// drawing does (claude-docs/components/click-feedback.md, "Fades").

// Past the longest fade (`$motion-short`), so a fade that never reports its
// end, in a background tab or a browser that skipped it, still ends.
const FADE_LIMIT_MS = 400;

// Under reduced motion the stylesheet draws no fade, so nothing would end one.
const fadesAreOff = (): boolean =>
  typeof window.matchMedia !== 'function' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface Fade {
  /** Whether the piece is in the page: shown, or fading out. */
  drawn: boolean;
  /** Fading out: drawn, but no longer shown. */
  closing: boolean;
  /** Goes on the piece: its fade's end takes it out of the page. */
  onAnimationEnd: (event: AnimationEvent<HTMLElement>) => void;
}

export function useFade(shown: boolean): Fade {
  const [drawn, setDrawn] = useState(shown);
  const [was, setWas] = useState(shown);

  // Adjusted as it renders rather than in an effect, so the piece never
  // paints one frame in its old state.
  if (shown !== was) {
    setWas(shown);
    if (shown) setDrawn(true);
    else if (fadesAreOff()) setDrawn(false);
  }

  useEffect(() => {
    if (shown || !drawn) return;
    const timer = window.setTimeout(() => setDrawn(false), FADE_LIMIT_MS);
    return () => window.clearTimeout(timer);
  }, [shown, drawn]);

  const onAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLElement>) => {
      // Its own fade only, not one bubbling from inside it.
      if (event.target === event.currentTarget && !shown) setDrawn(false);
    },
    [shown],
  );

  return { drawn: shown || drawn, closing: !shown && drawn, onAnimationEnd };
}

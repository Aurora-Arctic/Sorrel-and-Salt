'use client';

import { FADE_LIMIT_MS, prefersReducedMotion } from '@/lib/motion';
import { useCallback, useEffect, useState } from 'react';
import type { AnimationEvent } from 'react';

// The callout's and the badge's fade out: the piece stays drawn, marked closing, until its animation ends. Whether it
// is open (`aria-expanded`, the focus going back) never waits for it (claude-docs/components/click-feedback.md, "Fades").

export interface Fade {
  drawn: boolean;
  /** Fading out: drawn, but no longer shown. */
  closing: boolean;
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
    else if (prefersReducedMotion()) setDrawn(false);
  }

  useEffect(() => {
    if (shown || !drawn) return;
    const timer = window.setTimeout(() => setDrawn(false), FADE_LIMIT_MS);
    return () => window.clearTimeout(timer);
  }, [shown, drawn]);

  const onAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLElement>) => {
      if (event.target === event.currentTarget && !shown) setDrawn(false);
    },
    [shown],
  );

  return { drawn: shown || drawn, closing: !shown && drawn, onAnimationEnd };
}

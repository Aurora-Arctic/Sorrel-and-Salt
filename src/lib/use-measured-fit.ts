'use client';

import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';

// How many of a row's items fit its room, found by measuring rather than by a media query, so it follows the text
// size as well as the window (claude-docs/components/section-nav.md, "What is measured"). The caller renders every
// item while the answer is null, the hook measures that render before it is painted, and the caller then renders
// the answer.

export interface MeasuredFitOptions<Natural> {
  /** The row: observed for a change of size. */
  ref: RefObject<HTMLElement | null>;
  /** Off, nothing is measured or observed and the answer is null. */
  enabled?: boolean;
  /** The items' own sizes, read from the render that shows them all; null when nothing is laid out. */
  measure: (element: HTMLElement) => Natural | null;
  /** The answer, from the sizes measured and the room the row has now. */
  choose: (natural: Natural, element: HTMLElement) => number;
  /** The sizes measured no longer hold, as when the text size changed, so they are measured afresh. */
  stale?: (natural: Natural, element: HTMLElement) => boolean;
  /** What else to observe: an item's size changes with the text size where the row's may not. */
  watch?: (element: HTMLElement) => Iterable<Element>;
  /** The answer when there is no layout to measure. */
  fallback: number;
  /** A change of it measures afresh, as a navigation that changes the items' widths. */
  resetKey?: unknown;
}

export function useMeasuredFit<Natural>({
  ref,
  enabled = true,
  measure,
  choose,
  stale,
  watch,
  fallback,
  resetKey,
}: MeasuredFitOptions<Natural>): number | null {
  const [fit, setFit] = useState<number | null>(null);
  const natural = useRef<Natural | null>(null);

  // Turned on, or the key changed: measured afresh, the answer reset while rendering as React asks of state derived
  // from a prop.
  const [seen, setSeen] = useState({ enabled, resetKey });
  if (seen.enabled !== enabled || !Object.is(seen.resetKey, resetKey)) {
    setSeen({ enabled, resetKey });
    setFit(null);
  }

  // The latest callbacks, read by the effects without re-running them on every render.
  const latest = useRef({ measure, choose, stale, watch, fallback });
  useLayoutEffect(() => {
    latest.current = { measure, choose, stale, watch, fallback };
  });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || fit !== null || !element) return;
    const { measure: read, choose: pick, fallback: otherwise } = latest.current;
    natural.current = read(element);
    setFit(natural.current ? pick(natural.current, element) : otherwise);
  }, [enabled, fit, ref]);

  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element || typeof ResizeObserver === 'undefined') return;
    const refit = (): void => {
      const known = natural.current;
      if (!known) return;
      const { choose: pick, stale: outdated } = latest.current;
      setFit(outdated?.(known, element) ? null : pick(known, element));
    };
    const observer = new ResizeObserver(refit);
    observer.observe(element);
    for (const each of latest.current.watch?.(element) ?? []) observer.observe(each);
    // Web fonts arriving change every width.
    let current = true;
    void document.fonts?.ready.then(() => {
      if (current) setFit(null);
    });
    return () => {
      current = false;
      observer.disconnect();
    };
  }, [enabled, ref]);

  return enabled ? fit : null;
}

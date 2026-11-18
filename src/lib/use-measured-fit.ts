'use client';

import type { RefObject } from 'react';

export interface MeasuredFitOptions<Natural> {
  ref: RefObject<HTMLElement | null>;
  enabled?: boolean;
  measure: (element: HTMLElement) => Natural | null;
  choose: (natural: Natural, element: HTMLElement) => number;
  stale?: (natural: Natural, element: HTMLElement) => boolean;
  watch?: (element: HTMLElement) => Iterable<Element>;
  fallback: number;
  resetKey?: unknown;
}

export function useMeasuredFit<Natural>(options: MeasuredFitOptions<Natural>): number | null {
  void options;
  return null;
}

import type { HeldJar } from './types';

export interface Fill {
  level: number;
  mark: number | null;
}

const STEADY = 0.7;

/**
 * The fill of a held jar: with a threshold, full is twice the threshold or the quantity, whichever
 * is more (claude-docs/components/jar-shelf.md, "Contracts").
 */
export function fillOf({ quantity, threshold }: Pick<HeldJar, 'quantity' | 'threshold'>): Fill {
  const marked = threshold !== null && threshold > 0;
  if (quantity === null) return { level: STEADY, mark: null };
  if (!marked) return { level: quantity > 0 ? STEADY : 0, mark: null };
  const full = Math.max(2 * threshold, quantity);
  return { level: quantity > 0 ? Math.min(quantity / full, 1) : 0, mark: threshold / full };
}

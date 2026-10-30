import type { HeldJar } from './types';

/** How far up the glass a jar's contents stand, and where its low-stock mark sits, as fractions of a full jar. */
export interface Fill {
  /** 0 is empty, 1 is full. */
  level: number;
  /** The low-stock threshold's fraction, or `null` for no mark. */
  mark: number | null;
}

/** What an unmeasured jar, or one with no threshold to scale by, stands at. */
const STEADY = 0.7;

/**
 * The fill of a held jar: with a threshold, full is twice the threshold or the quantity, whichever
 * is more (claude-docs/components/jar-shelf.md, "The level").
 */
export function fillOf({ quantity, threshold }: Pick<HeldJar, 'quantity' | 'threshold'>): Fill {
  const marked = threshold !== null && threshold > 0;
  if (quantity === null) return { level: STEADY, mark: null };
  if (!marked) return { level: quantity > 0 ? STEADY : 0, mark: null };
  const full = Math.max(2 * threshold, quantity);
  return { level: quantity > 0 ? Math.min(quantity / full, 1) : 0, mark: threshold / full };
}

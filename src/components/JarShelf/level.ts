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
 * The fill of a held jar.
 *
 * TODO(owner): the rule is mine, the mock gave only example fractions. With a
 * threshold, "full" is twice the threshold or the quantity, whichever is more:
 * a jar at its threshold stands half full, the mark half way, and a jar above
 * twice the threshold stands full. With no threshold there is nothing to scale
 * by, so a measured jar stands at 70% with no mark, and an unmeasured one
 * (`null`) the same, because "held but not measured" must not look empty. A
 * quantity of 0 is empty whatever the threshold. Written up in
 * claude-docs/components/jar-shelf.md, "The level".
 */
export function fillOf({ quantity, threshold }: Pick<HeldJar, 'quantity' | 'threshold'>): Fill {
  const marked = threshold !== null && threshold > 0;
  if (quantity === null) return { level: STEADY, mark: null };
  if (!marked) return { level: quantity > 0 ? STEADY : 0, mark: null };
  const full = Math.max(2 * threshold, quantity);
  return { level: quantity > 0 ? Math.min(quantity / full, 1) : 0, mark: threshold / full };
}

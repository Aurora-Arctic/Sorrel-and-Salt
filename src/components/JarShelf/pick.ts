import { BOTTLES, JARS } from './shapes';
import type { JarShapeName } from './types';

/** The forms that are poured: they get a bottle, and any other form a jar. */
export const LIQUID =
  /oil|tincture|essence|water|vinegar|syrup|extract|juice|elixir|infusion|hydrosol/i;

/** djb2 (a small, well-known string hash) over a text's characters, as an unsigned 32-bit number. */
export function hash(text: string): number {
  let h = 5381;
  for (const c of text) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * The vessel for a form of an ingredient: the same pair always gets the same one, a liquid form
 * from the bottles and anything else from the jars (claude-docs/components/jar-shelf.md,
 * "Choosing and drawing the vessel").
 */
export function pick(seed: string, form: string): JarShapeName {
  const pool = LIQUID.test(form) ? BOTTLES : JARS;
  const key = `${seed.trim().toLowerCase()} ${form.trim().toLowerCase()}`;
  return pool[hash(key) % pool.length] as JarShapeName;
}

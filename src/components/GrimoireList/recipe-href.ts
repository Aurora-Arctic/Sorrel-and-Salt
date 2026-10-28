import type { Route } from 'next';

/** A spell's recipe page (MB.6) in its coven. */
export const recipeHref = (covenSlug: string, spellId: string): Route =>
  `/coven/${covenSlug}/grimoire/${spellId}` as Route;

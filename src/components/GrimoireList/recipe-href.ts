import type { Route } from 'next';

/** A spell's recipe page (MB.6) in its coven. */
export const recipeHref = (covenSlug: string, spellId: string): Route =>
  `/coven/${covenSlug}/grimoire/${spellId}` as Route;

/** The list at `closeHref` with a spell's Quick Look (M13.21) open over it. */
export const lookHrefOf = (closeHref: string, id: string): Route =>
  `${closeHref}${closeHref.includes('?') ? '&' : '?'}${new URLSearchParams({ spell: id })}` as Route;

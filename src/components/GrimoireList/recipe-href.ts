import type { Route } from 'next';
import { withParam } from '@/lib/list-href';

/** A spell's recipe page in its coven. */
export const recipeHref = (covenSlug: string, spellId: string): Route =>
  `/coven/${covenSlug}/grimoire/${spellId}` as Route;

/** The list at `closeHref` with a spell's Quick Look open over it. */
export const lookHrefOf = (closeHref: string, id: string): Route =>
  withParam(closeHref, 'spell', id);

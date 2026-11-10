import type { Route } from 'next';
import { withParam } from '@/lib/list-href';

export const recipeHref = (covenSlug: string, spellId: string): Route =>
  `/coven/${covenSlug}/grimoire/${spellId}` as Route;

export const lookHrefOf = (closeHref: string, id: string): Route =>
  withParam(closeHref, 'spell', id);

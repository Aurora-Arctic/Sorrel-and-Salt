import type { Route } from 'next';
import { withParam } from '@/lib/list-href';
import { covenPath } from '@/lib/coven-path';

export const recipeHref = (covenSlug: string, spellId: string): Route =>
  covenPath(covenSlug, 'grimoire', spellId);

export const lookHrefOf = (closeHref: string, id: string): Route =>
  withParam(closeHref, 'spell', id);

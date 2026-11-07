import type { Route } from 'next';
import { withParam } from '../../lib/list-href';
import { UNTITLED_SPELL } from '../SpellCard';

export const deletedHrefOf = (closeHref: Route, title: string | null): Route =>
  withParam(closeHref, 'deleted', title?.trim() || UNTITLED_SPELL);

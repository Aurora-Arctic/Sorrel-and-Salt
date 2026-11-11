import type { Route } from 'next';
import { withParam } from '../../lib/list-href';
import { spellNameOf } from '../SpellCard/untitled';

export const deletedHrefOf = (closeHref: Route, title: string | null): Route =>
  withParam(closeHref, 'deleted', spellNameOf(title));

import type { Route } from 'next';
import { withParam } from '../../lib/list-href';
import { UNTITLED_SPELL } from '../SpellCard';

// Where a deleted spell's screen leaves for: the grimoire tab it was opened over, filters kept and
// the dialog's parameter dropped, with `deleted=<name>` for the list's Notice. Shared by every Delete.

/** `closeHref` with the deleted spell's name added; an untitled spell is named as the list names it. */
export const deletedHrefOf = (closeHref: Route, title: string | null): Route =>
  withParam(closeHref, 'deleted', title?.trim() || UNTITLED_SPELL);

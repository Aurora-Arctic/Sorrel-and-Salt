import type { Route } from 'next';
import { UNTITLED_SPELL } from '../SpellCard';

// Where a deleted spell's screen leaves for (M13.11): the grimoire tab it was opened over, its
// filters kept and its dialog's parameter dropped, with `deleted=<name>` for the list's Notice.
// One function for the card's bin, the Quick Look, and the builder's Delete.

/** `closeHref` with the deleted spell's name added; an untitled spell is named as the list names it. */
export const deletedHrefOf = (closeHref: Route, title: string | null): Route =>
  `${closeHref}${closeHref.includes('?') ? '&' : '?'}${new URLSearchParams({ deleted: title?.trim() || UNTITLED_SPELL })}` as Route;

import type { ReactElement } from 'react';
import AddIcon from '../AddIcon';
import { HeldMark } from '../CompendiumCards/held-mark';
import type { CupboardPlus } from './types';

// The plus beside an entry's pencil, on the entry page and in its Quick Look window (M9.12; the
// owner's calls, 2026-10-20), one component so the two cannot differ: the card's plus while some
// coven the viewer may add in lacks the entry, and the card's check in its place once every one
// holds it, so the pair keeps its space rather than leave it empty. A page that gives no `plus`
// (a coven's own entry, a retired one, a viewer in no coven that may add) draws neither.

/**
 * The plus or the check for `ingredientId`, or nothing without `plus`. Both carry `name`, the
 * entry as its card names it, after their tips (MB.120).
 */
export default function PlusMark({
  plus,
  ingredientId,
  name,
}: {
  plus: CupboardPlus | undefined;
  ingredientId: string;
  name: string;
}): ReactElement | null {
  if (!plus) return null;
  return plus.covens.some(({ id }) => !plus.heldIn.includes(id)) ? (
    <AddIcon {...plus} ingredientId={ingredientId} name={name} />
  ) : (
    <HeldMark name={name} />
  );
}

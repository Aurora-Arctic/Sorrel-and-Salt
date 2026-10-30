import type { ReactElement } from 'react';
import AddIcon from '../AddIcon';
import { HeldMark } from '../CompendiumCards/held-mark';
import type { CupboardPlus } from './types';

// The plus beside an entry's pencil, on the entry page and in its Quick Look window: the card's
// plus while some coven the viewer may add in lacks the entry, else the card's check, so the pair
// keeps its space. A page with no `plus` draws neither.

/** The plus or the check for `ingredientId`, or nothing without `plus`; both carry `name` after their tips. */
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

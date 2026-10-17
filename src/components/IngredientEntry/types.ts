import type { Route } from 'next';
import type { IngredientDetail, IngredientRow } from '@/modules/ingredients';

/** What a substitute names when it links an ingredient, which is what its page is found by. */
export type LinkedIngredient = Pick<IngredientRow, 'id' | 'slug' | 'workspaceId'>;

export interface IngredientEntryProps {
  /** The entry and everything its page shows, as `ingredientDetailOf` assembles it. */
  detail: IngredientDetail;
  /**
   * Where a linked substitute's page is: the public page for a compendium
   * entry, the coven's for one of its own. `undefined` sets the name as
   * plain text, as for a typed substitute, since a route may have no page
   * to offer for it.
   */
  hrefOf: (ingredient: LinkedIngredient) => Route | undefined;
  /**
   * Where Edit goes, for a viewer who may edit this entry. Left out, nothing
   * is offered; there is never a Delete here (M8.15).
   */
  edit?: { href: Route };
  /**
   * The entry that moved off this address while its redirect's window is
   * open (MB.82): its name, and its page now.
   */
  movedAway?: { name: string; href: Route };
  /** The public page of a compendium entry, which the coven route links to. */
  canonical?: Route;
}

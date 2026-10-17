import type { Route } from 'next';
import type { IngredientDetail, IngredientRow } from '@/modules/ingredients';
import type { EditedIngredient } from '../IngredientForm/types';

/** The part of an entry its edit modal names itself by and edits. */
export type EditableEntry = Pick<IngredientRow, 'id' | 'name' | 'canonicalName' | 'nomenclature'>;

/** What Edit needs: where the page is with the modal asked for, and where each way out of it leads. */
export interface IngredientEntryEdit {
  /** The page's own address with a bare `?edit`: Edit's link, and what a press navigates to for the modal's contents. */
  href: Route;
  /** The page's own address: where closing the modal goes back to. */
  closeHref: Route;
  /** Where a deleted entry leaves to, since its own page is gone. */
  deletedHref: Route;
  /**
   * Where a save stays, the modal still open, when the address does not
   * change with the entry's slug (a coven's, which names the id). Left out,
   * a save moves to the public address of the slug it saved, `?edit` kept,
   * since a rename changes that slug.
   */
  savedHref?: Route;
  /**
   * The entry's values, read for the form. Present only when the page was
   * asked for with `?edit`: the modal then renders with its form. Absent, the
   * modal provider shows its skeleton over a press until the page with
   * `?edit` arrives (M9.18).
   */
  opened?: EditedIngredient;
}

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
   * Edit for a viewer who may edit this entry: a compendium entry's, for a
   * curator. It opens the compendium edit modal over this very page, so every
   * address here is the page's own. Left out, nothing is offered; there is
   * never a Delete beside it, only the one inside the modal (M8.15).
   */
  edit?: IngredientEntryEdit;
  /**
   * The entry that moved off this address while its redirect's window is
   * open (MB.82): its name, and its page now.
   */
  movedAway?: { name: string; href: Route };
  /** The public page of a compendium entry, which the coven route links to. */
  canonical?: Route;
}

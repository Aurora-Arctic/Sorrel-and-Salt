import type { CompendiumValues, CupboardOverrides } from '../CupboardEntryForm/types';
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
  /**
   * The side column's "In the Compendium" block (M12.12). For a coven's own
   * entry, the compendium entries it replaces: up to three links, each titled
   * "Name (Formal Name)" (or the name alone) and going to the entry's public
   * page. For a compendium entry, itself: one link to its public page. `tip`
   * is the sentence in the ⓘ beside the heading, chosen by the page. `total`
   * is how many are replaced in all; past the links shown, "See All" goes to
   * `allHref`, the compendium search for the entry's label. `allHref` is left
   * out where nothing is hidden, and then no See All shows. The block is left
   * out for a local replacing nothing.
   */
  replaces?: {
    tip: string;
    entries: { title: string; href: Route }[];
    total: number;
    allHref?: Route;
  };
  /**
   * The cupboard buttons (M12.17), for a compendium entry seen from a coven:
   * Add to Cupboard, or Annotate This Entry and Remove from Cupboard once the
   * coven holds it, each only for a member whose role permits it. Left out on
   * the public page and for a coven's own entry.
   */
  cupboard?: CupboardProps;
}

/**
 * What a coven's member may do about a compendium entry in their cupboard
 * (M12.17). Left out on the public page and for a coven's own entry.
 */
export interface CupboardProps {
  workspaceId: string;
  /** What the member may do, from their role: add needs create, annotate update, remove delete. */
  canAdd: boolean;
  canAnnotate: boolean;
  canRemove: boolean;
}

/** What the client buttons need to draw: the props above, and the entry's two sides for the form. */
export interface CupboardActionsProps extends CupboardProps {
  ingredientId: string;
  /** The coven holds the entry now. */
  held: boolean;
  compendium: CompendiumValues;
  overrides: CupboardOverrides;
}

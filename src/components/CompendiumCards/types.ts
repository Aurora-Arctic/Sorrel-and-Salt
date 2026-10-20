import type { Route } from 'next';
import type { ModalHeading, RouteModalLink } from '../Modal/types';
import type { CompendiumListProps, CompendiumListFilter } from '../CompendiumList/types';
import type { EntryRecency } from '../EntryMarks/types';
import type { CardCategory } from '../IngredientCard/types';
import type { SafetyVariant } from '../SafetyNote/types';
import type { NomenclatureKind } from '@/modules/ingredients/schema/ingredient-enums';

/** One compendium entry as its card shows it. */
export interface CompendiumCardEntry {
  id: string;
  /** What the compendium calls it. */
  name: string;
  slug: string;
  /** The formal name, null for none; it tells two entries of one name apart. */
  canonicalName: string | null;
  nomenclature: NomenclatureKind;
  categories: readonly CardCategory[];
  /** Its live forms, each with its group's icon. */
  variants: readonly SafetyVariant[];
  toxic: boolean;
  safetyNotes: string | null;
  /** New or Updated, from the entry's stamps; none once 30 days have passed. */
  recency: EntryRecency | null;
  /**
   * The search's own address with `?entry=<id>`, where the card's Quick Look opens the
   * entry's details over the results (M12.5), for anyone; left out, no Quick Look shows.
   */
  details?: RouteModalLink;
  /**
   * The search's own address with `?edit=<slug>`, where the card's Edit opens the
   * compendium's edit dialog over the results (M8.17). Given for a curator alone; left out,
   * no Edit shows.
   */
  editHref?: Route;
  /** The head of the dialog Edit opens, shown at once over a skeleton while the form loads. */
  editHeading?: ModalHeading;
  /**
   * Every coven the viewer may write in holds this entry (M9.12): its card shows the check, not
   * the plus. With one such coven that is whether it holds it.
   */
  held?: boolean;
  /**
   * The ids of the covens that hold it, among `CompendiumCardsProps.covens`. The plus's picker
   * shows those as held and cannot choose them. Left out, none does.
   */
  heldIn?: readonly string[];
  /**
   * Where the check leads: the entry as a coven holds it, the default coven's if it does, else
   * the first that does. Left out, a held card shows neither mark.
   */
  heldHref?: Route;
}

/**
 * What the foot of each card holds (M8.18): `add` is Add to My Ingredients, for a signed-in
 * owner or member of a coven; `none` is nothing, for an account that only views and for a
 * signed-out visitor, who signs in through the header.
 */
export type CompendiumCardsAction = 'add' | 'none';

export interface CompendiumCardsProps extends Pick<
  CompendiumListProps,
  | 'filter'
  | 'facets'
  | 'categories'
  | 'vocabulary'
  | 'previousHref'
  | 'nextHref'
  | 'position'
  | 'total'
> {
  entries: readonly CompendiumCardEntry[];
  /** What the foot of each card holds. */
  action: CompendiumCardsAction;
  /**
   * The coven the plus adds to (M9.12), and the picker's default: the one Add Ingredient would
   * choose, which on this page, with no coven in its address, is the first the viewer may write
   * in. With `action` `add` and no coven, the cards show no plus and no check.
   */
  workspaceId?: string;
  /**
   * Every coven the viewer may write in, in the order Add Ingredient lists them. Two or more and
   * the plus opens a picker of them; fewer and it adds to `workspaceId` at once.
   */
  covens?: readonly CompendiumCoven[];
}

/** A coven the viewer may add to, as the picker names it. */
export interface CompendiumCoven {
  id: string;
  name: string;
}

/** The plus at a card's bottom right: add this entry to a coven, asking which when there are several. */
export interface AddIconProps {
  /** The default coven: added to at once with fewer than two `covens`, else the picker's first choice. */
  workspaceId: string;
  /** The compendium entry's id. */
  ingredientId: string;
  /** Every coven the viewer may write in. */
  covens: readonly CompendiumCoven[];
  /** The ids of those that already hold the entry. */
  heldIn: readonly string[];
}

/** The picker the plus opens when the viewer may write in several covens. */
export interface AddToCovenDialogProps extends AddIconProps {
  /** The dialog's title: the card's "Add to My Ingredients" by default; the entry page's button says "Add to Cupboard" (M9.12). */
  title?: string;
  onClose: () => void;
  /** The add succeeded and the modal is closing: the page is to be read again. */
  onAdded: () => void;
}

/** The check at a card's bottom right: this entry is held, and the link leads to it. */
export interface HeldLinkProps {
  href: Route;
}

export type { CompendiumListFilter };

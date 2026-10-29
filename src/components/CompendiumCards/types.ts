import type { Route } from 'next';
import type { ModalHeading, RouteModalLink } from '../Modal/types';
import type { CompendiumCoven } from '../AddIcon/types';
import type { CompendiumListProps, CompendiumListFilter } from '../CompendiumList/types';
import type { EntryRecency } from '../EntryMarks/types';
import type { CardCategory } from '../IngredientCard/types';
import type { CupboardPlace } from '../IngredientEntry/types';
import type { SafetyVariant } from '../SafetyNote/types';
import type { NomenclatureKind } from '@/modules/ingredients/schema/ingredient-enums';

/**
 * A coven that holds the entry and lets the viewer do something about it from the card's More:
 * the coven (its name, its address segment, for the own entry Make It Ours leads to), what the
 * role there permits, and the entry page's address with this coven's `?annotate`.
 */
export type CompendiumCardPlace = Pick<
  CupboardPlace,
  | 'workspaceId'
  | 'covenSlug'
  | 'name'
  | 'canAnnotate'
  | 'canMakeOurs'
  | 'canRemove'
  | 'annotateHref'
  | 'stock'
>;

/** What a card's More, and the Quick Look window's made from it, needs of one entry. */
export interface CompendiumCardMoreProps {
  id: string;
  /** The entry's name as the compendium calls it, which the confirmations say. */
  label: string;
  /** The entry's name and formal name, read after the control's name: "More for Name, Formal". */
  name: string;
  /** The viewer's covens that hold the entry and permit at least one choice, the default first. */
  places: readonly CompendiumCardPlace[];
  /** Where a remove leads once done, for the Quick Look window: the list without it. */
  leaveHref?: Route;
}

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
   * The search's own address with `?entry=<id>`, where the card's Quick Look opens
   * the entry's details over the results. Left out, no Quick Look shows.
   */
  details?: RouteModalLink;
  /**
   * The search's own address with `?edit=<slug>`, where the card's Edit opens the
   * compendium's edit dialog over the results. For a curator alone; left out, no Edit.
   */
  editHref?: Route;
  /** The head of the dialog Edit opens, shown at once over a skeleton while the form loads. */
  editHeading?: ModalHeading;
  /**
   * Every coven the viewer may write in holds this entry: its card shows the check,
   * not the plus.
   */
  held?: boolean;
  /**
   * The ids of the covens that hold it, among `CompendiumCardsProps.covens`. The plus's menu
   * shows those disabled. Left out, none does.
   */
  heldIn?: readonly string[];
  /**
   * The names of every coven of the viewer's that holds it, any role: counted on the
   * plus or the check and named in its tip. Left out, or empty, neither shows.
   */
  holding?: readonly string[];
  /**
   * The covens that hold this entry and let the viewer annotate it, make it their own or remove
   * it, for the card's More. Left out, or empty, no More shows. Given to a signed-in member alone.
   */
  places?: readonly CompendiumCardPlace[];
}

/**
 * What the foot of each card holds: `add` is Add to My Ingredients, for a signed-in
 * owner or member of a coven; `none` is nothing, for a viewer-only account and a
 * signed-out visitor.
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
  | 'cursor'
> {
  entries: readonly CompendiumCardEntry[];
  /** What the foot of each card holds. */
  action: CompendiumCardsAction;
  /**
   * The default coven: the one Add Ingredient would choose, which with no coven in
   * the address is the first the viewer may write in. With `action` `add` and no
   * coven, the cards show no plus and no check.
   */
  workspaceId?: string;
  /**
   * Every coven the viewer may write in, in the order Add Ingredient lists them. With two or more,
   * a card's plus is a menu of them all by name; with one, it adds there at once.
   */
  covens?: readonly CompendiumCoven[];
  /**
   * Every coven the viewer belongs to, any role, for the filter's In My Covens.
   * Left out, or empty, the field does not show.
   */
  myCovens?: readonly { id: string; name: string }[];
}

export type { CompendiumCoven };
export type { CompendiumListFilter };

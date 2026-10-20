import type { Route } from 'next';
import type { ModalHeading } from '../Modal/types';
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
   * The search's own address with `?edit=<slug>`, where the card's Edit opens the
   * compendium's edit dialog over the results (M8.17). Given for a curator alone; left out,
   * no Edit shows.
   */
  editHref?: Route;
  /** The head of the dialog Edit opens, shown at once over a skeleton while the form loads. */
  editHeading?: ModalHeading;
  /** The switcher's coven already holds this entry (M9.12): its card shows the check, not the plus. */
  held?: boolean;
  /** Where the check leads: the entry as the coven holds it. Left out, a held card shows neither mark. */
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
   * The coven the switcher has chosen, which the plus adds to (M9.12). With `action` `add` and
   * no coven, the cards show no plus and no check.
   */
  workspaceId?: string;
}

/** The plus at a card's bottom left: add this entry to the coven. */
export interface AddIconProps {
  workspaceId: string;
  /** The compendium entry's id. */
  ingredientId: string;
}

/** The check at a card's bottom left: this entry is held, and the link leads to it. */
export interface HeldLinkProps {
  href: Route;
}

export type { CompendiumListFilter };

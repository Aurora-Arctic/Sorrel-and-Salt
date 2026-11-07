import type { Route } from 'next';
import type { ModalHeading, RouteModalLink } from '../Modal/types';
import type { CompendiumCoven } from '../AddIcon/types';
import type { CompendiumListProps } from '../CompendiumList/types';
import type { EntryRecency } from '../EntryMarks/types';
import type { CardCategoryRef } from '../IngredientCard/types';
import type { CupboardPlace } from '../IngredientEntry/types';
import type { SafetyVariant } from '../SafetyNote/types';
import type { MyCoven } from '../FacetPanel/types';
import type { NomenclatureKind } from '@/modules/ingredients/schema/ingredient-enums';

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

export interface CompendiumCardMoreProps {
  id: string;
  label: string;
  name: string;
  places: readonly CompendiumCardPlace[];
  /** Where a remove leads once done, for the Quick Look window: the list without it. */
  leaveHref?: Route;
}

export interface CompendiumCardEntry {
  id: string;
  name: string;
  slug: string;
  canonicalName: string | null;
  nomenclature: NomenclatureKind;
  categories: readonly CardCategoryRef[];
  variants: readonly SafetyVariant[];
  toxic: boolean;
  safetyNotes: string | null;
  recency: EntryRecency | null;
  details?: RouteModalLink;
  editHref?: Route;
  editHeading?: ModalHeading;
  held?: boolean;
  heldIn?: readonly string[];
  holding?: readonly string[];
  /** Given to a signed-in member alone. */
  places?: readonly CompendiumCardPlace[];
}

export type CompendiumCardsAction = 'add' | 'none';

export interface CompendiumCardsProps extends Pick<
  CompendiumListProps,
  | 'filter'
  | 'counts'
  | 'categories'
  | 'vocabulary'
  | 'previousHref'
  | 'nextHref'
  | 'position'
  | 'total'
  | 'cursor'
> {
  entries: readonly CompendiumCardEntry[];
  action: CompendiumCardsAction;
  /**
   * The default coven: the one Add Ingredient would choose, which with no coven in
   * the address is the first the viewer may write in. With `action` `add` and no
   * coven, the cards show no plus and no check.
   */
  workspaceId?: string;
  covens?: readonly CompendiumCoven[];
  myCovens?: readonly MyCoven[];
}

export type { CompendiumCoven };

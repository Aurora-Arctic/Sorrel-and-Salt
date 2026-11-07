import type { Route } from 'next';
import type { CompendiumListFilterProps, CompendiumListProps } from '../CompendiumList/types';
import type { EntryKind } from '../EntryMarks/types';
import type { CardCategory } from '../IngredientCard/types';
import type { LastEditProps } from '../LastEdit/types';
import type { JarLine } from '../JarLines/types';
import type { ModalHeading, RouteModalLink } from '../Modal/types';
import type { SafetyVariant } from '../SafetyNote/types';
import type { StockDialogProps } from '../StockDialog/types';
import type { NomenclatureKind } from '@/modules/ingredients/schema/ingredient-enums';

export interface CovenCardEntry {
  id: string;
  label: string;
  canonicalName: string | null;
  nomenclature: NomenclatureKind;
  categories: readonly CardCategory[];
  variants: readonly SafetyVariant[];
  toxic: boolean;
  safetyNotes: string | null;
  kind: EntryKind;
  retired: boolean;
  jars: readonly JarLine[];
  lastEdit?: LastEditProps | null;
  details: RouteModalLink;
  editHref?: Route;
  editHeading?: ModalHeading;
  annotateHref?: Route;
  mayMakeOurs?: boolean;
  mayRemove?: boolean;
  stock?: Pick<StockDialogProps, 'forms' | 'jars'>;
}

export interface CardMoreProps extends Pick<
  CovenCardEntry,
  'id' | 'label' | 'mayMakeOurs' | 'mayRemove'
> {
  name: string;
  workspaceId: string;
  covenSlug: string;
  /**
   * Where a delete or a remove leads once done, replacing the history entry: the Quick Look
   * window's, which goes back to the list without it. Left out, the list is read again.
   */
  leaveHref?: Route;
}

export interface CovenCardsProps extends Pick<
  CompendiumListProps,
  | 'facets'
  | 'categories'
  | 'vocabulary'
  | 'previousHref'
  | 'nextHref'
  | 'position'
  | 'total'
  | 'cursor'
> {
  covenSlug: string;
  workspaceId: string;
  entries: readonly CovenCardEntry[];
  filter: CompendiumListFilterProps['filter'];
  canAdd: boolean;
}

export interface EmptyCupboardProps extends Pick<
  CovenCardsProps,
  'covenSlug' | 'filter' | 'canAdd'
> {}

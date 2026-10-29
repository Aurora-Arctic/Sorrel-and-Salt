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

/** One entry of a coven's cupboard as its card shows it, already merged with the coven's label. */
export interface CovenCardEntry {
  id: string;
  /** What the coven calls it: its cupboard entry's label where one is set, else the entry's name. */
  label: string;
  /** The formal name, null for none; it tells two entries of one label apart. */
  canonicalName: string | null;
  nomenclature: NomenclatureKind;
  categories: readonly CardCategory[];
  /** Its live forms, each with its group's icon. */
  variants: readonly SafetyVariant[];
  toxic: boolean;
  safetyNotes: string | null;
  /** Whose entry it is: the coven's `own`, or a compendium entry its cupboard names (`cupboard`). */
  kind: EntryKind;
  /** The curators retired the entry. */
  retired: boolean;
  /** The coven's jars of it, one per form held. */
  jars: readonly JarLine[];
  /** Who last edited it and when: the newest of its jars and, for a coven's own entry, its row. */
  lastEdit?: LastEditProps | null;
  /** Its details modal over the list, `?entry=<id>`, which the Quick Look eye opens. */
  details: RouteModalLink;
  /**
   * The list's own address with `?edit=<id>`, where the card's Edit opens the coven's
   * edit dialog. Left out, no Edit shows: a compendium entry, or a role that may not update.
   */
  editHref?: Route;
  /** The head of the dialog Edit opens, shown at once over a skeleton while the form loads. */
  editHeading?: ModalHeading;
  /**
   * The list's own address with `?annotate=<id>`, where the card's Annotate opens the
   * coven's Annotate dialog. Left out, no Annotate shows: the coven's own entry, or a
   * role that may not update.
   */
  annotateHref?: Route;
  /** The coven's own entry, for a role that may delete it: More offers Delete Ingredient. */
  mayDelete?: boolean;
  /** A compendium entry the cupboard holds, for a role that may make it the coven's own. */
  mayMakeOurs?: boolean;
  /** A compendium entry the cupboard holds, for a role that may remove it. */
  mayRemove?: boolean;
  /**
   * Every form the entry comes in and the coven's jars of them, for a role that may
   * update the stock: the foot then draws the Edit Stock pencil. Left out, no pencil.
   */
  stock?: Pick<StockDialogProps, 'forms' | 'jars'>;
}

/** A card's More (`card-more.tsx`): the entry, its coven, and what the role may do to it. */
export interface CardMoreProps extends Pick<
  CovenCardEntry,
  'id' | 'label' | 'mayDelete' | 'mayMakeOurs' | 'mayRemove'
> {
  /** The card's name with its formal name, read after each control's verb. */
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
  /** The coven's address segment, which every link and the filter's submit are built under. */
  covenSlug: string;
  /** The coven's id, which the type-ahead and the live counts read. */
  workspaceId: string;
  entries: readonly CovenCardEntry[];
  /** The filter the page shows, with the coven's Source, In Stock and Low Stock Only choices. */
  filter: CompendiumListFilterProps['filter'];
  /** The viewer may add to this coven: an empty cupboard then offers the first add. */
  canAdd: boolean;
}

/** What the list draws with no card to show: the filter decides which of its two states. */
export interface EmptyCupboardProps extends Pick<
  CovenCardsProps,
  'covenSlug' | 'filter' | 'canAdd'
> {}

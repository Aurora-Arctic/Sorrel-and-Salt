import type {
  CompendiumValues,
  CupboardEntryFormProps,
  CupboardOverrides,
} from '../CupboardEntryForm/types';
import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { AddIconProps } from '../AddIcon/types';
import type { ModalHeading, RouteModalLink } from '../Modal/types';
import type { IngredientDetail, IngredientRow, SourcingScore } from '@/modules/ingredients';
import type { EditedIngredient, ReviewOffer } from '../IngredientForm/types';
import type { LastEditProps } from '../LastEdit/types';
import type { EntryMarksProps } from '../EntryMarks/types';
import type { StockData } from '../StockDialog/types';
import type { StockDialogProps } from '../StockDialog/types';

export type EditableEntry = Pick<IngredientRow, 'id' | 'name' | 'canonicalName' | 'nomenclature'>;

export interface IngredientEntryEdit {
  href: Route;
  closeHref: Route;
  /** Where a deleted entry leaves to, since its own page is gone. */
  deletedHref: Route;
  savedHref?: Route;
  /** The entry's values for the form, present only when the page was asked for with `?edit`; absent, the modal shows its skeleton over a press. */
  opened?: EditedIngredient;
  /** The Reviewed switch as a field of the compendium's edit form: Save carries it; left out for a coven's entry and for anyone who cannot curate. */
  review?: ReviewOffer;
  sourcing?: SourcingScore | null;
  coven?: {
    workspaceId: string;
    ingredientsHref: Route;
    mayPromote: boolean;
    stock?: StockData;
  };
}

export type LinkedIngredient = Pick<IngredientRow, 'id' | 'slug' | 'workspaceId'>;

export interface IngredientEntryProps {
  hiddenFromPublic?: boolean;
  reviewControl?: ReactNode;
  lastEdit?: LastEditProps | null;
  detail: IngredientDetail;
  hrefOf: (ingredient: LinkedIngredient) => Route | undefined;
  edit?: IngredientEntryEdit;
  back?: { href: Route; label: string; also?: readonly { path: string; label: string }[] };
  /** A paused viewer's standing site pause: the entry draws the shell's notice at the top of its text column, where the shell's own band cannot line up with it. */
  accessPause?: { until: Date | null };
  movedAway?: { name: string; href: Route };
  /** The side column's "In the Compendium" block (claude-docs/components/ingredient-entry.md, "Props in detail"); left out for a local with no match. */
  replaces?: {
    tip: string;
    entries: { title: string; href: Route }[];
    total: number;
    allHref?: Route;
  };
  similar?: {
    tip: string;
    entries: { title: string; href: Route }[];
    total: number;
    allHref?: Route;
  };
  cupboard?: CupboardProps;
  covens?: PublicCupboardProps;
  heldInCovens?: boolean;
  stock?: EntryStock;
}

export interface EntryStock extends Pick<StockDialogProps, 'workspaceId' | 'forms' | 'jars'> {
  mayEdit: boolean;
}

export interface CupboardPlace {
  workspaceId: string;
  covenSlug: string;
  name: string;
  held: boolean;
  canAdd: boolean;
  canAnnotate: boolean;
  canRemove: boolean;
  canMakeOurs: boolean;
  annotateHref: Route;
  stock?: StockData;
}

export interface PublicCupboardProps {
  covens: CupboardPlace[];
  /** The coven Add Ingredient would choose: the confirmations start on it where it may. */
  defaultWorkspaceId: string;
  annotate: {
    closeHref: Route;
    opened?: { workspaceId: string; overrides: CupboardOverrides; revision: number | null };
  };
}

export interface PublicCupboardActionsProps extends PublicCupboardProps {
  ingredientId: string;
  compendium: CompendiumValues;
  edit?: { href: Route; entry: EditableEntry };
}

export interface CupboardProps {
  workspaceId: string;
  covenSlug: string;
  canAdd: boolean;
  canAnnotate: boolean;
  canRemove: boolean;
  canMakeOurs: boolean;
  /** Annotate opens its dialog from the address: the link, where closing goes back to, and whether the address asks for it now (claude-docs/components/ingredient-entry.md, "Props in detail"). */
  annotate: { href: Route; closeHref: Route; opened: boolean };
  removedHref?: Route;
  /** The plus beside the pencil, read by `plusCovensOf` (src/app/plus-covens.ts); left out, neither the plus nor its check is drawn (claude-docs/components/ingredient-entry.md, "Props in detail"). */
  plus?: CupboardPlus;
  stock?: StockData;
}

export type CupboardPlus = Omit<AddIconProps, 'ingredientId'>;

export interface CupboardActionsProps extends CupboardProps {
  ingredientId: string;
  held: boolean;
  compendium: CompendiumValues;
  overrides: CupboardOverrides;
  edit?: { href: Route; entry: EditableEntry };
}

export type DetailsMarks = Omit<EntryMarksProps, 'provenance' | 'safety'>;

export interface OwnEntryActionsProps {
  edit: Pick<IngredientEntryEdit, 'href' | 'deletedHref' | 'coven'>;
  entry: EditableEntry;
}

export interface IngredientDetailsOpened {
  heading: ModalHeading;
  marks?: DetailsMarks;
  lastEdit?: LastEditProps | null;
  reviewLine?: ReactNode;
  pageHref: Route;
  /** An Edit opening the edit modal over the details at the list's own `?edit=`, for whoever may edit the entry (claude-docs/components/ingredient-entry.md, "Props in detail"). */
  editAction?: RouteModalLink & {
    name?: string;
    inCompendium?: boolean;
  };
  /** The compendium card's three dots (`CompendiumCardMore`) after the plus and Edit, made from the card's own component so the window mirrors the card. */
  more?: ReactNode;
  /** The coven card's foot controls (`covenCardActions`) in place of `editAction`; a delete or a remove leads to the list without the details, which closes them. */
  actions?: ReactNode;
  /** The plus beside the pencil for a live compendium entry, read per request by `plusCovensOf` (src/app/plus-covens.ts); needs `ingredientId` (claude-docs/components/ingredient-entry.md, "Props in detail"). */
  plus?: CupboardPlus;
  ingredientId?: string;
  children?: ReactNode;
}

export interface IngredientDetailsDialogProps {
  closeHref: Route;
  opened?: IngredientDetailsOpened;
}

/** The coven's Annotate dialog: where closing goes, where focus returns when RouteModal's fallbacks do not fit, and the form's values once the address asks; left out, it shows only while a press loads it. */
export interface AnnotateDialogProps {
  closeHref: Route;
  returnTo?: () => HTMLElement | null | undefined;
  opened?: Omit<CupboardEntryFormProps, 'onDone' | 'aside'>;
  more?: AnnotateMoreProps;
}

export interface CupboardWritesOptions {
  workspaceId: string;
  covenSlug: string;
  ingredientId: string;
  removedHref?: Route;
  onSettle: () => void;
  onRefused: (message: string) => void;
}

export interface DeleteEntryOptions {
  workspaceId: string;
  id: string;
  deletedHref?: Route;
  announcement?: string;
  onSettle: () => void;
  onRefused: (message: string) => void;
}

export interface CupboardWrite {
  run: () => void;
  pending: boolean;
  /** Forgets the last write's outcome before it is asked again: a remove stays busy past its success, so a second confirmation would open busy without it. */
  reset?: () => void;
}

export interface CupboardWrites {
  remove: CupboardWrite;
  makeOurs: CupboardWrite;
}

export interface CupboardQuestionProps {
  name: string;
  write: CupboardWrite;
  onClose: () => void;
  /** Where the focus goes back to, the menu item that opened it having gone with the menu. */
  returnTo: () => HTMLElement | null | undefined;
  covens?: CovenChoiceProps;
}

export interface CovenChoiceProps {
  options: readonly { id: string; name: string }[];
  chosen: string;
  onChoose: (workspaceId: string) => void;
}

export interface AnnotateMoreProps {
  covenSlug: string;
  canMakeOurs: boolean;
  canRemove: boolean;
  removedHref?: Route;
}

export interface SummaryJar {
  variantId: string;
  quantity: number | null;
  unit: string | null;
  threshold: number | null;
}

export interface ReviewMarkProps {
  ingredientId: string;
  reviewedAt: string | null;
  alongside?: ReactNode;
}

export interface ShownToggleProps {
  ingredientId?: string;
  shown: boolean;
  onChange?: (next: boolean) => void;
  name: string;
  label?: string;
  accessibleName?: string;
}

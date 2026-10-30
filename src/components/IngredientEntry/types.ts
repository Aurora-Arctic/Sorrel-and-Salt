import type {
  CompendiumValues,
  CupboardEntryFormProps,
  CupboardOverrides,
} from '../CupboardEntryForm/types';
import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { AddIconProps } from '../AddIcon/types';
import type { ModalHeading, RouteModalLink } from '../Modal/types';
import type { IngredientDetail, IngredientRow } from '@/modules/ingredients';
import type { EditedIngredient, ReviewOffer } from '../IngredientForm/types';
import type { LastEditProps } from '../LastEdit/types';
import type { EntryMarksProps } from '../EntryMarks/types';
import type { StockData } from '../StockDialog/types';
import type { StockDialogProps } from '../StockDialog/types';

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
  /** Where a save stays, modal open, when the address does not change with the slug; left out, a save moves to the saved slug's public address with `?edit` kept. */
  savedHref?: Route;
  /** The entry's values for the form, present only when the page was asked for with `?edit`; absent, the modal shows its skeleton over a press. */
  opened?: EditedIngredient;
  /** The Reviewed switch as a field of the compendium's edit form: Save carries it; left out for a coven's entry and for anyone who cannot curate. */
  review?: ReviewOffer;
  /** A coven's own entry: the form writes to this coven and its near matches open in it; `mayPromote` is the role's answer to making a folk name the display name; left out, the entry is the compendium's. */
  coven?: {
    workspaceId: string;
    /** The coven's ingredient list; an entry's page in the coven is beneath it, by id. */
    ingredientsHref: Route;
    /** The role's answer, worked out by the page, to making a folk name the display name. */
    mayPromote: boolean;
    /** What Edit Stock reads on the coven's own entry: every form and the coven's jars of it; given only where the role may update stock. */
    stock?: StockData;
  };
}

/** What a substitute names when it links an ingredient, which is what its page is found by. */
export type LinkedIngredient = Pick<IngredientRow, 'id' | 'slug' | 'workspaceId'>;

export interface IngredientEntryProps {
  /** The Reviewed switch as the last row of the page's head, built for a curator or admin from the uncached review read; it saves on flip. */
  reviewControl?: ReactNode;
  /** Who last edited the entry in this coven and when, from `lastEditsOf`; none draws no line. */
  lastEdit?: LastEditProps | null;
  /** The entry and everything its page shows, as `ingredientDetailOf` assembles it. */
  detail: IngredientDetail;
  /** Where a linked substitute's page is; `undefined` sets the name as plain text, as for a typed substitute. */
  hrefOf: (ingredient: LinkedIngredient) => Route | undefined;
  /** Edit for a viewer who may edit this entry, opening the edit modal over this page; left out, nothing is offered, and Delete is only inside the modal. */
  edit?: IngredientEntryEdit;
  /** A quiet way back to the list, at the head's top left; `label` is the destination alone, and the link reads "Back to" it. Left out, no link. */
  back?: { href: Route; label: string };
  /** The entry that moved off this address while its redirect's window is open: its name, and its page now. */
  movedAway?: { name: string; href: Route };
  /** The side column's "In the Compendium" block (claude-docs/components/ingredient-entry.md, "Props in detail"); left out for a local with no match. */
  replaces?: {
    tip: string;
    entries: { title: string; href: Route }[];
    total: number;
    allHref?: Route;
  };
  /** The side column's "Similar in the Compendium" block for an own entry with no formal name, shaped as `replaces`; a display only. */
  similar?: {
    tip: string;
    entries: { title: string; href: Route }[];
    total: number;
    allHref?: Route;
  };
  /** The cupboard buttons for a compendium entry seen from a coven; left out on the public page and for a coven's own entry. */
  cupboard?: CupboardProps;
  /** The same buttons on the public page, for a signed-in person with a coven they may write in; changes none of the page's marks. */
  covens?: PublicCupboardProps;
  /** The public page's: one of the viewer's covens holds this entry; draws the shelf before the name and nothing else. */
  heldInCovens?: boolean;
  /** The Stock section on a coven's page for an entry the coven has; left out, no section shows. */
  stock?: EntryStock;
}

/** The coven's jars of the entry, for its Stock section. */
export interface EntryStock extends Pick<StockDialogProps, 'workspaceId' | 'forms' | 'jars'> {
  /** The role permits `inventory: ['update']`: the heading carries Edit Stock. */
  mayEdit: boolean;
}

/** One of the viewer's writable covens, as the public page's cupboard choices name it. */
export interface CupboardPlace {
  workspaceId: string;
  /** The coven's address segment, for the own entry Make It Ours leads to. */
  covenSlug: string;
  /** What a choice of coven lists it as. */
  name: string;
  /** This coven holds the entry now. */
  held: boolean;
  /** The role's answers in this coven, read as `CupboardProps` reads them. */
  canAdd: boolean;
  canAnnotate: boolean;
  canRemove: boolean;
  canMakeOurs: boolean;
  /** The public page with `?annotate=<covenSlug>`: opens this coven's Annotate dialog over it. */
  annotateHref: Route;
  /** What Edit Stock reads: every form and this coven's jars of it; given only where the coven holds the entry and the role may update stock. */
  stock?: StockData;
}

/** The public page's cupboard choices: the viewer's writable covens, and the dialog the address opens. */
export interface PublicCupboardProps {
  /** The writable covens, the default first. */
  covens: CupboardPlace[];
  /** The coven Add Ingredient would choose: the confirmations start on it where it may. */
  defaultWorkspaceId: string;
  /** Where Annotate closes to, plus the coven and annotations the address names when the viewer may annotate there; any other `?annotate` is ignored. */
  annotate: {
    closeHref: Route;
    opened?: { workspaceId: string; overrides: CupboardOverrides; revision: number | null };
  };
}

/** What the client buttons need on the public page: the covens, and the compendium's side of the form. */
export interface PublicCupboardActionsProps extends PublicCupboardProps {
  ingredientId: string;
  compendium: CompendiumValues;
  /** Edit in Compendium, for a curator: the main icon on the compendium's pages, else in More. */
  edit?: { href: Route; entry: EditableEntry };
}

/** What a coven's member may do about a compendium entry in their cupboard. */
export interface CupboardProps {
  workspaceId: string;
  /** The coven's address segment, for the own entry Make It Ours leads to. */
  covenSlug: string;
  /** What the member may do, from their role: add needs create, annotate update, remove delete. */
  canAdd: boolean;
  canAnnotate: boolean;
  canRemove: boolean;
  /** Make It Ours, on the permission the service asserts (`MAKE_IT_OURS_PERMISSION`); offered once the coven holds the entry, a retired one included. */
  canMakeOurs: boolean;
  /** Annotate opens its dialog from the address: the link, where closing goes back to, and whether the address asks for it now (claude-docs/components/ingredient-entry.md, "Props in detail"). */
  annotate: { href: Route; closeHref: Route; opened: boolean };
  /** Where a remove leads for a retired entry, whose page reads nothing once its cupboard row is gone; left out, a remove reads the page again. */
  removedHref?: Route;
  /** The plus beside the pencil, read by `plusCovensOf` (src/app/plus-covens.ts); left out, neither the plus nor its check is drawn (claude-docs/components/ingredient-entry.md, "Props in detail"). */
  plus?: CupboardPlus;
  /** What Edit Stock reads, as on a `CupboardPlace`; left out, the menu has no Edit Stock. */
  stock?: StockData;
}

/** The plus's covens, as `AddIconProps` but the entry; the check stands in its place once every one of `covens` is in `heldIn`. */
export type CupboardPlus = Omit<AddIconProps, 'ingredientId'>;

/** What the client buttons need to draw: the props above, and the entry's two sides for the form. */
export interface CupboardActionsProps extends CupboardProps {
  ingredientId: string;
  /** The coven holds the entry now. */
  held: boolean;
  compendium: CompendiumValues;
  overrides: CupboardOverrides;
  /** Edit, for a curator: joins the cupboard's choices in the one Edit menu. */
  edit?: { href: Route; entry: EditableEntry };
}

/** The marks the details head draws, as plain values the server page can hand to the client dialog; `provenance` and `safety` are the dialog's to set. */
export type DetailsMarks = Omit<EntryMarksProps, 'provenance' | 'safety'>;

/** What a coven's own entry's icons (`OwnEntryActions`) need: the entry, where Edit goes, and where a delete leads. */
export interface OwnEntryActionsProps {
  edit: Pick<IngredientEntryEdit, 'href' | 'deletedHref' | 'coven'>;
  entry: EditableEntry;
}

/** What a details modal's address opens over a list. */
export interface IngredientDetailsOpened {
  /** The entry's name and formal name, under the eyebrow "Ingredient" (`detailsHeading`). */
  heading: ModalHeading;
  /** What the head's badges say, from `detailsMarks`; left out, no badge shows. */
  marks?: DetailsMarks;
  /** Who last edited the entry in this coven and when; drawn above the head's buttons. */
  lastEdit?: LastEditProps | null;
  /** The review line for a curator or admin: the last row of the head, the Reviewed switch at its start and the review day at its end. */
  reviewLine?: ReactNode;
  /** The entry's own page, which the foot's link (See in Compendium or See in Your Cupboard) reaches. */
  pageHref: Route;
  /** An Edit opening the edit modal over the details at the list's own `?edit=`, for whoever may edit the entry (claude-docs/components/ingredient-entry.md, "Props in detail"). */
  editAction?: RouteModalLink & {
    /** The card's own name for the entry, name then formal name, which its Edit link is read as. */
    name?: string;
    /** Named and tipped Edit in Compendium, as the public compendium's card has it, where the plain Edit is the admin table's. */
    inCompendium?: boolean;
  };
  /** The compendium card's three dots (`CompendiumCardMore`) after the plus and Edit, made from the card's own component so the window mirrors the card. */
  more?: ReactNode;
  /** The coven card's foot controls (`covenCardActions`) in place of `editAction`; a delete or a remove leads to the list without the details, which closes them. */
  actions?: ReactNode;
  /** The plus beside the pencil for a live compendium entry, read per request by `plusCovensOf` (src/app/plus-covens.ts); needs `ingredientId` (claude-docs/components/ingredient-entry.md, "Props in detail"). */
  plus?: CupboardPlus;
  /** The compendium entry's id, which the plus adds. */
  ingredientId?: string;
  /** The summary, drawn by the server page from the entry page's own sections. */
  children?: ReactNode;
}

export interface IngredientDetailsDialogProps {
  /** The list the modal opened over, its `?entry=` dropped: closing goes back there. */
  closeHref: Route;
  /** What the address opens; none when it opens nothing, or while a press's is on its way. */
  opened?: IngredientDetailsOpened;
}

/** The coven's Annotate dialog: where closing goes, where focus returns when RouteModal's fallbacks do not fit, and the form's values once the address asks; left out, it shows only while a press loads it. */
export interface AnnotateDialogProps {
  closeHref: Route;
  returnTo?: () => HTMLElement | null | undefined;
  opened?: Omit<CupboardEntryFormProps, 'onDone' | 'aside'>;
  /** Make It Ours and Remove in a More menu at the form's foot; left out, no menu. */
  more?: AnnotateMoreProps;
}

/** What `useCupboardWrites` needs: the entry, where a remove leads, and how the caller's confirmation closes and shows a refusal. */
export interface CupboardWritesOptions {
  workspaceId: string;
  /** The coven's address segment, for the own entry Make It Ours leads to. */
  covenSlug: string;
  ingredientId: string;
  /** Where a remove leads, replacing the address; left out, the page reads again. */
  removedHref?: Route;
  /** Closes the caller's confirmation on a refusal; a remove's closes with the page it changed. */
  onSettle: () => void;
  /** Shows a refusal's sentence in the caller's alert. */
  onRefused: (message: string) => void;
}

/** What `useDeleteEntry` deletes, and what follows it. */
export interface DeleteEntryOptions {
  workspaceId: string;
  /** The coven's own entry. */
  id: string;
  /** Where a delete leads, replacing the address; left out, the page reads again. */
  deletedHref?: Route;
  /** Said in the page's status region once the delete succeeds; none, nothing is said. */
  announcement?: string;
  /** Closes the caller's confirmation on a refusal; a delete's closes with the page it changed. */
  onSettle: () => void;
  /** Shows a refusal's sentence in the caller's alert. */
  onRefused: (message: string) => void;
}

/** One cupboard write: start it, and whether it is in flight. */
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

/** One of the two confirmation dialogs, as the entry page and the Annotate dialog open it. */
export interface CupboardQuestionProps {
  /** The entry as the coven calls it. */
  name: string;
  write: CupboardWrite;
  /** Asked to close it: Cancel, the Close button, Escape or a click outside. */
  onClose: () => void;
  /** Where the focus goes back to, the menu item that opened it having gone with the menu. */
  returnTo: () => HTMLElement | null | undefined;
  /** Which coven, asked above the question where two or more of the viewer's covens hold the entry and permit the write (the public page). */
  covens?: CovenChoiceProps;
}

/** A dropdown of the viewer's covens, as Make It Ours and Remove ask above their question. */
export interface CovenChoiceProps {
  options: readonly { id: string; name: string }[];
  chosen: string;
  onChoose: (workspaceId: string) => void;
}

/** The Annotate dialog's Make It Ours and Remove: the coven's address segment, which the member may use (the entry page's permissions), and where a remove leads (`closeHref` when left out). */
export interface AnnotateMoreProps {
  covenSlug: string;
  canMakeOurs: boolean;
  canRemove: boolean;
  removedHref?: Route;
}

/** One of the coven's jars as the details modal's Forms block reads it: the form it holds by variant id, and its stock; the Edit Stock dialog's jar, less its id. */
export interface SummaryJar {
  variantId: string;
  /** On hand: `null` is held but not measured, `0` is out. */
  quantity: number | null;
  unit: string | null;
  /** The low-stock threshold, `null` or 0 for none. */
  threshold: number | null;
}

/** The Reviewed switch on a compendium entry (`review-mark.tsx`), which saves on flip: the entry, and when a curator last marked it reviewed as an ISO moment, or `null` while it needs review. */
export interface ReviewMarkProps {
  ingredientId: string;
  reviewedAt: string | null;
}

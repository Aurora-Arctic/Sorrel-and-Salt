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
  /**
   * The Reviewed switch as a field of the compendium's edit form (M14.8), as the page
   * found the mark: Save carries it. Left out for a coven's entry and for anyone who cannot curate.
   */
  review?: ReviewOffer;
  /**
   * A coven's own entry (M8.17): the form writes to this coven, and its
   * near matches open in it. `mayPromote` is the role's answer, which the
   * page works out, to making a folk name the display name. Left out, the
   * entry is the compendium's.
   */
  coven?: {
    workspaceId: string;
    /** The coven's ingredient list; an entry's page in the coven is beneath it, by id. */
    ingredientsHref: Route;
    mayPromote: boolean;
    /**
     * What Edit Stock reads on the coven's own entry (M9.12): every form the entry comes in and
     * this coven's jars of it. Given only where the role may update stock; left out, the entry
     * offers no Edit Stock.
     */
    stock?: StockData;
  };
}

/** What a substitute names when it links an ingredient, which is what its page is found by. */
export type LinkedIngredient = Pick<IngredientRow, 'id' | 'slug' | 'workspaceId'>;

export interface IngredientEntryProps {
  /**
   * The Reviewed switch (M14.8), drawn as the last row of the page's head, under the title: the page builds it for a
   * curator or admin from the uncached review read, and leaves it out for anyone else. It saves
   * the moment it is flipped, as in the Quick Look.
   */
  reviewControl?: ReactNode;
  /** Who last edited the entry in this coven and when (M6.18), from `lastEditsOf`; none draws no line. */
  lastEdit?: LastEditProps | null;
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
   * A quiet way back to the list this page belongs to, at the head's top
   * left: the Compendium for the public page, the coven's Ingredients for
   * its own. Left out, no link shows. `label` is the destination alone
   * ("Compendium"); the link reads "Back to" it.
   */
  back?: { href: Route; label: string };
  /**
   * The entry that moved off this address while its redirect's window is
   * open (MB.82): its name, and its page now.
   */
  movedAway?: { name: string; href: Route };
  /**
   * The side column's "In the Compendium" block (M12.12). For a coven's own
   * entry, the compendium entries of the same formal name: up to three links, each titled
   * "Name (Formal Name)" (or the name alone) and going to the entry's public
   * page. For a compendium entry, itself: one link to its public page. `tip`
   * is the sentence in the ⓘ beside the heading, chosen by the page. `total`
   * is how many are found in all; past the links shown, "See All" goes to
   * `allHref`, the compendium search for the entry's label. `allHref` is left
   * out where nothing matches, and then no See All shows. The block is left
   * out for a local with no match.
   */
  replaces?: {
    tip: string;
    entries: { title: string; href: Route }[];
    total: number;
    allHref?: Route;
  };
  /**
   * The side column's "Similar in the Compendium" block (M12.22), for an own
   * entry that declares no formal name: the compendium entries sharing its
   * label, three then See All, in the shape `replaces` has. A display only:
   * nothing here turns the entry into one of them (v1 links one way,
   * DESIGN.md §13).
   */
  similar?: {
    tip: string;
    entries: { title: string; href: Route }[];
    total: number;
    allHref?: Route;
  };
  /**
   * The cupboard buttons (M12.17), for a compendium entry seen from a coven:
   * the plus (`plus`) while some coven may still add it, and Annotate, Make It
   * Ours and Remove once the coven holds it, each only for a member whose role permits it. Left out on
   * the public page and for a coven's own entry.
   */
  cupboard?: CupboardProps;
  /**
   * The same buttons on the public page (M9.12), for a signed-in person with a
   * coven they may write in: each of those covens, with whether it holds the
   * entry and what the person's role there permits. Left out for a visitor, for
   * someone with no such coven, and where no coven offers a choice. Unlike
   * `cupboard`, it changes none of the page's marks: the public page is the
   * compendium's, and says nothing of any coven's.
   */
  covens?: PublicCupboardProps;
  /**
   * The public page's (M9.12): one of the viewer's covens, of any role, holds this entry, read
   * by `covensHoldingEntry` as the details modal's In Your Cupboards is. Draws the shelf before the
   * name and nothing else; false for a visitor.
   */
  heldInCovens?: boolean;
  /**
   * The Stock section (M12.29), on a coven's page for an entry the coven has, its own or
   * one in its cupboard: the coven's jars of it, as the Edit Stock dialog takes them, and
   * whether the role may edit them, which draws the dialog's button in the heading. Left
   * out, no section shows: the public page, and a compendium entry the coven does not hold.
   */
  stock?: EntryStock;
}

/** The coven's jars of the entry, for its Stock section (M12.29). */
export interface EntryStock extends Pick<StockDialogProps, 'workspaceId' | 'forms' | 'jars'> {
  /** The role permits `inventory: ['update']`: the heading carries Edit Stock. */
  mayEdit: boolean;
}

/** One of the viewer's writable covens, as the public page's cupboard choices name it (M9.12). */
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
  /**
   * What Edit Stock reads (M9.12): every form the entry comes in and this coven's jars of it.
   * Given only where the coven holds the entry and the role may update stock; left out, the
   * coven offers no Edit Stock.
   */
  stock?: StockData;
}

/** The public page's cupboard choices (M9.12): the viewer's writable covens, and the dialog the address opens. */
export interface PublicCupboardProps {
  /** The writable covens, the default first. */
  covens: CupboardPlace[];
  /** The coven Add Ingredient would choose: the confirmations start on it where it may. */
  defaultWorkspaceId: string;
  /**
   * Where the Annotate dialog closes to, the page's own address; and, when the
   * address names a holding coven the viewer may annotate in, that coven and
   * its annotations. The page ignores any other `?annotate`.
   */
  annotate: { closeHref: Route; opened?: { workspaceId: string; overrides: CupboardOverrides } };
}

/** What the client buttons need on the public page: the covens, and the compendium's side of the form. */
export interface PublicCupboardActionsProps extends PublicCupboardProps {
  ingredientId: string;
  compendium: CompendiumValues;
  /** Edit in Compendium, for a curator: the main icon on the compendium's pages, else in More. */
  edit?: { href: Route; entry: EditableEntry };
}

/**
 * What a coven's member may do about a compendium entry in their cupboard
 * (M12.17). Left out on the public page and for a coven's own entry.
 */
export interface CupboardProps {
  workspaceId: string;
  /** The coven's address segment, for the own entry Make It Ours leads to. */
  covenSlug: string;
  /** What the member may do, from their role: add needs create, annotate update, remove delete. */
  canAdd: boolean;
  canAnnotate: boolean;
  canRemove: boolean;
  /**
   * Make It Ours (M12.23), on the permission the service asserts, read from
   * `MAKE_IT_OURS_PERMISSION`; offered once the coven holds the entry, a
   * retired one included.
   */
  canMakeOurs: boolean;
  /**
   * Annotate opens its dialog from the address, as the curator's Edit does:
   * the link and the `?annotate` it names, where closing goes back to, and
   * whether the address asks for it now. Only set `opened` for a member who
   * may annotate and a coven that holds the entry; otherwise the page ignores
   * the parameter.
   */
  annotate: { href: Route; closeHref: Route; opened: boolean };
  /**
   * Where a remove leads, for an entry whose page reads nothing once its
   * cupboard row is gone: a retired one (M12.24), which only that row still
   * reaches. Left out, a remove reads the page again, which offers Add.
   */
  removedHref?: Route;
  /**
   * The plus beside the pencil (the owner's call, 2026-10-20): the viewer's covens that may
   * add, this one among them where it may, and which hold the entry. Given, Add stands apart from
   * the other choices; left out (a coven's own entry, a retired one, no coven that may add),
   * neither the plus nor its check is drawn. `plusCovensOf` (src/app/plus-covens.ts) reads it.
   */
  plus?: CupboardPlus;
  /**
   * What Edit Stock reads (M9.12), as on a `CupboardPlace`: every form the entry comes in and
   * this coven's jars of it. Given only where the coven holds the entry and the role may update
   * stock; left out, the menu has no Edit Stock.
   */
  stock?: StockData;
}

/**
 * The plus's covens, on the coven's entry page (and the details modal after it): AddIcon's
 * props but the entry, which the page already has. The check stands in its place once every
 * one of `covens` is in `heldIn`.
 */
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

/**
 * The marks the details head draws, as `EntryMarks` takes them: plain values, so the
 * server page can hand them to the client dialog. The safety badge goes beside the
 * name and the rest in a row under the formal name, so `provenance` and `safety` are
 * the dialog's to set.
 */
export type DetailsMarks = Omit<EntryMarksProps, 'provenance' | 'safety'>;

/**
 * What a coven's own entry's icons (`OwnEntryActions`) need: the entry, where Edit
 * goes, and where a delete leads. The entry page passes its whole `IngredientEntryEdit`.
 */
export interface OwnEntryActionsProps {
  edit: Pick<IngredientEntryEdit, 'href' | 'deletedHref' | 'coven'>;
  entry: EditableEntry;
}

/** What a details modal's address opens over a list (M12.5). */
export interface IngredientDetailsOpened {
  /** The entry's name and formal name, under the eyebrow "Ingredient" (`detailsHeading`). */
  heading: ModalHeading;
  /**
   * What the head's badges say, worked out by the page from the entry
   * (`detailsMarks`): the same marks the entry page and the card draw. Left out,
   * no badge shows.
   */
  marks?: DetailsMarks;
  /** Who last edited the entry in this coven and when (M6.18); drawn above the head's buttons. */
  lastEdit?: LastEditProps | null;
  /**
   * The review line (M14.8), for a curator or admin: the last row of the head, under the title,
   * the Reviewed switch at its start and the review day at its end. The switch saves on flip.
   */
  reviewLine?: ReactNode;
  /** The entry's own page, which the foot's link (See in Compendium or See in Your Cupboard) reaches. */
  pageHref: Route;
  /**
   * An Edit that opens the edit modal over the details, for whoever may edit
   * the entry, at the list's own `?edit=`: an admin or curator on the admin
   * list, an owner or member on a coven's list for the coven's own entry (not
   * a compendium entry it holds). None for anyone else.
   */
  editAction?: RouteModalLink & {
    /** The card's own name for the entry, name then formal name, which its Edit link is read as. */
    name?: string;
    /**
     * Named and tipped Edit in Compendium, as the public compendium's card has it, where the
     * plain Edit is the admin table's (the owner's call, 2026-10-20).
     */
    inCompendium?: boolean;
  };
  /**
   * The compendium card's three dots for this entry (`CompendiumCardMore`), after the plus and
   * Edit: what the viewer may do in the covens that hold it. Made by the page from the same
   * component the card uses, so the window mirrors the card it was opened from.
   */
  more?: ReactNode;
  /**
   * The coven card's own foot controls for this entry (`covenCardActions`), drawn in place of
   * `editAction`: Edit or Annotate, and the card's More or bin, so the window's icons are the
   * card's the window was opened from (the owner's call, 2026-10-20). A delete or a remove leads to
   * the list without the details, which closes them.
   */
  actions?: ReactNode;
  /**
   * The plus beside the pencil, for a live compendium entry (M9.12; the owner's call, 2026-10-20):
   * every coven the viewer may add in and which hold it, read per request by `plusCovensOf`
   * (src/app/plus-covens.ts). The check stands in its place once every one holds the entry. Left
   * out (a coven's own entry, a retired one, a viewer in no coven that may add, a visitor),
   * neither is drawn. Needs `ingredientId`.
   */
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

/**
 * The coven's Annotate dialog (`annotate-dialog.tsx`): where closing goes, where the
 * focus goes back to when RouteModal's own fallbacks do not fit, and the form's values
 * once the address asks for the dialog. Left out, it shows only while a press loads it.
 */
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

/** One cupboard write: start it, and whether it is in flight. */
/** What `useDeleteEntry` deletes, and what follows it (M8.17). */
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

export interface CupboardWrite {
  run: () => void;
  pending: boolean;
  /**
   * Forgets the last write's outcome before it is asked again: a remove stays
   * busy past its success, so a second confirmation would open busy without it.
   */
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
  /**
   * Which coven, asked above the question where two or more of the viewer's
   * covens hold the entry and permit the write (M9.12, the public page): the
   * covens that do, the one chosen, and the choice changing it.
   */
  covens?: CovenChoiceProps;
}

/** A dropdown of the viewer's covens, as Make It Ours and Remove ask above their question (M9.12). */
export interface CovenChoiceProps {
  options: readonly { id: string; name: string }[];
  chosen: string;
  onChoose: (workspaceId: string) => void;
}

/**
 * The Annotate dialog's Make It Ours and Remove (M8.17): the coven's address segment, which
 * of Make It Ours and Remove the member may use, from the same permissions the
 * entry page reads, and where a remove leads, `closeHref` when left out.
 */
export interface AnnotateMoreProps {
  covenSlug: string;
  canMakeOurs: boolean;
  canRemove: boolean;
  removedHref?: Route;
}

/**
 * One of the coven's jars as the details modal's Forms block reads it (M9.9): the form it
 * holds, by variant id, and its stock. The Edit Stock dialog's own jar, less its id.
 */
export interface SummaryJar {
  variantId: string;
  /** On hand: `null` is held but not measured, `0` is out. */
  quantity: number | null;
  unit: string | null;
  /** The low-stock threshold, `null` or 0 for none. */
  threshold: number | null;
}

/**
 * The curator's Reviewed switch on a compendium entry (M14.8, `review-mark.tsx`), which saves on flip: the
 * entry, and when a curator last marked it reviewed, as an ISO moment, or `null` while it needs
 * review. The badge saying so is the entry's own mark (`EntryMarks`), drawn for everyone.
 */
export interface ReviewMarkProps {
  ingredientId: string;
  reviewedAt: string | null;
}

import type {
  CompendiumValues,
  CupboardEntryFormProps,
  CupboardOverrides,
} from '../CupboardEntryForm/types';
import type { Route } from 'next';
import type { FormHolding, IngredientDetail, IngredientRow } from '@/modules/ingredients';
import type { EditedIngredient, SubstituteLink } from '../IngredientForm/types';

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
   * A coven's own entry (M8.17): the form writes to this coven, and its
   * near matches open in it. `mayPromote` is the role's answer, which the
   * page works out, to making a folk name the display name; `linkHref`, the
   * Link dialog's address, is given only where the role may link, for the
   * foot's More menu. Left out, the entry is the compendium's.
   */
  coven?: {
    workspaceId: string;
    /** The coven's ingredient list; an entry's page in the coven is beneath it, by id. */
    ingredientsHref: Route;
    mayPromote: boolean;
    linkHref?: Route;
    /**
     * The Link dialog's reading, present only when the address asks for it
     * (`?link`) and the role may link; the dialog closes to `closeHref`.
     */
    linkOpened?: LinkDialogProps['opened'];
  };
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
   * label, three then See All, in the shape `replaces` has. `convert` is
   * left out for a role that may not convert (a viewer), and then no
   * radios and **Link to Selected** show; given, each entry names the coven's
   * page for it, where a successful conversion goes.
   */
  similar?: {
    tip: string;
    entries: { title: string; href: Route; id: string; thenHref: Route }[];
    total: number;
    allHref?: Route;
    convert?: { workspaceId: string; localId: string };
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
}

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
export interface CupboardWrite {
  run: () => void;
  pending: boolean;
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
 * The Link dialog's body (M8.17): the coven's own entry, what each of its
 * forms holds as `localHoldings` counts it, and the coven's ingredient list,
 * beneath which a linked entry's page is, by id.
 */
export interface LinkFormProps {
  workspaceId: string;
  localId: string;
  ingredientsHref: Route;
  holdings: FormHolding[];
  onCancel: () => void;
}

/**
 * The Link dialog (`link-dialog.tsx`), opened from the address's `?link`: where
 * closing goes, and, once the address asks for it, the entry and its holdings.
 * Left out, it shows only while a press loads it.
 */
export interface LinkDialogProps {
  closeHref: Route;
  returnTo?: () => HTMLElement | null | undefined;
  opened?: Omit<LinkFormProps, 'onCancel'> & {
    /** The entry as the coven calls it: the dialog's eyebrow. */
    name: string;
  };
}

/** One compendium entry picked in the Link dialog, as its row and the form map read it. */
export interface LinkPick {
  id: string;
  name: string;
  link: SubstituteLink;
}

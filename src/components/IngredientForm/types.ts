import type { ReactNode, Ref, RefObject } from 'react';
import type { SectionFold } from '../CollapsibleSection/types';
import type { RouteModalLink } from '../Modal/types';
import type { z } from 'zod';
import type {
  CreateReferenceMutation,
  CreateWorkspaceIngredientMutation,
  FormSuggestionsQueryVariables,
  CelestialBodySuggestionsQuery,
  PossibleDuplicatesQuery,
} from '../../gql/graphql';
import type {
  INGREDIENT_ELEMENTS,
  NomenclatureKind,
  ReferenceKind,
} from '@/modules/ingredients/schema/ingredient-enums';
import type { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';
import type { ReferenceInput } from '@/modules/ingredients/validation/reference';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import type {
  ComboboxQualifier,
  ComboboxOption,
  EntryAction,
  Suggestions,
} from '../Combobox/types';
import type { FieldProps, SelectOption } from '../Field/types';
import type { Announce, LegendAction } from '../CategoryPicker/types';
import type { ShortCitationFields } from '@/lib/types';
// The arrays the unions below are derived from, as `INGREDIENT_ELEMENTS`'s is:
// a type import of a value, which brings nothing into the bundle.
import type { LIST_FIELDS, SECTION_KEYS, VARIANT_LISTS, VARIANT_SECTION_KEYS } from './values';

interface IngredientFormCallbacks {
  /**
   * Called with the saved row once the server has accepted it, and which save
   * was pressed: 'open', Save Ingredient, for the page to open the
   * ingredient; 'another', Save & Add Another, after which the form clears.
   */
  onSaved?: (ingredient: SavedIngredient, next: AfterSave) => void;
  /**
   * Called once, when an autosave has created a new ingredient, with the saved row: the page moves
   * its address from the add to the edit. Not called by Save or Close, whose callbacks say
   * what the page does next.
   */
  onCreated?: (ingredient: SavedIngredient) => void;
  /**
   * Called when an autosave has written to an ingredient that already existed, with the saved row:
   * the page brings its heading and address up to the saved name. Not called for the autosave that
   * creates one (`onCreated`), nor by Save or Close.
   */
  onAutosaved?: (ingredient: SavedIngredient) => void;
  /**
   * Reload, after another save changed the ingredient: the form is replaced with what the server
   * holds. Left out, the page reloads.
   */
  onReload?: () => void;
  /** Called once the entry given has been deleted. */
  onDeleted?: () => void;
  /** Where a near match the duplicate warning names links: a coven's ingredient page, or the admin's compendium modal. */
  duplicateHref: (match: Duplicate) => string;
  /**
   * A match's Quick Look, the details its list opens over the form; left out where the page under
   * the form has no details to open.
   */
  quickLookOf?: (match: Duplicate) => RouteModalLink;
  /**
   * Where a linked substitute's summary links its entry, opened in a new tab;
   * undefined for an entry with no page to open. Left out, a summary links
   * nothing.
   */
  entryHref?: EntryHref;
  /**
   * Whether a saved folk name may be made the display name: the compendium's edit passes true, a
   * coven's when the member's role may promote. It shows only on an edit of a saved entry's name.
   */
  mayPromote?: boolean;
  /**
   * Offers the compendium's Reviewed switch as a field of the form, on an add and an edit, for a
   * curator or admin only. A flip changes the form, Save sends it after the entry, Cancel drops it.
   */
  review?: ReviewOffer;
}

/** The Reviewed switch as the page found it: `reviewed` is whether a curator has marked the entry. */
export interface ReviewOffer {
  reviewed: boolean;
  /** When, as an ISO moment, if the page has it; an add has none. */
  reviewedAt?: string | null;
}

/** Where a linked ingredient's page is, by its address and its tier, or undefined for none. */
export type EntryHref = (ingredient: { slug: string; isGlobal: boolean }) => string | undefined;

/**
 * Where the form writes. With a `workspaceId`, the coven named: a new ingredient, or the coven's
 * own `entry`, saved over and deletable from it. With a null one, the compendium, likewise.
 */
export type IngredientFormProps = IngredientFormCallbacks &
  (
    | {
        workspaceId: string;
        entry?: EditedIngredient;
        /** The coven's name, which the page status region says an add from a match's + went to; "My Ingredients" when left out. */
        workspaceName?: string;
      }
    | { workspaceId: null; entry?: EditedIngredient; workspaceName?: undefined }
  );

/** The ingredient an edit opens: its id, which the writes name, and its values as the form shows them. */
export interface EditedIngredient {
  id: string;
  values: IngredientFormValues;
  /** The revision the page read, which the first save names so a change made since is not written over. */
  revision?: number | null;
  /** When the page read it saved, as an ISO moment: a copy kept in the browser is offered back only if newer. */
  updatedAt?: string | null;
}

/** What follows a save: the new ingredient opened, or the form cleared for another. */
export type AfterSave = 'open' | 'another';

type WorkspaceSaved = CreateWorkspaceIngredientMutation['createWorkspaceIngredient'];

/**
 * What a save answers: the ingredient, and for a coven’s new one the jars it holds. A save moves no
 * jar now, so the list comes back empty and the field is a leftover. A compendium save carries none.
 */
export type SavedIngredient = Omit<WorkspaceSaved, 'stock'> &
  Partial<Pick<WorkspaceSaved, 'stock'>>;

export type IngredientElement = (typeof INGREDIENT_ELEMENTS)[number];

/** One entry of a list field: `useFieldArray` keys objects, never bare strings. */
export interface ListEntry {
  value: string;
}

/**
 * One folk name. `id` is the saved row's, which promoting it names; a name
 * typed and not yet saved has none. Only the text is sent.
 */
export interface FolkNameListEntry extends ListEntry {
  id?: string;
}

/**
 * The ingredient a substitute links, with the formal name its pill reads
 * beside the label, and what its tooltip adds: its form, its tier and its
 * description. Only the id is sent.
 */
export interface SubstituteLink {
  id: string;
  canonicalName: string | null;
  /** Its live forms' text, in form order: `[]` for none. */
  forms: string[];
  description: string | null;
  /** A compendium entry, rather than this coven's own. */
  isGlobal: boolean;
  /** The forms it comes in, one of which a substitute may name. */
  variants?: SubstituteForm[];
}

/**
 * One form of a linked ingredient: its id, which a pick of it sends, its
 * text, and its curated group, which ranks the substitutes' suggestions.
 */
export interface SubstituteForm {
  id: string;
  form: string;
  group: string | null;
}

/**
 * One substitute: typed text, or a link to an ingredient, whose label is
 * `value` (DESIGN.md §5, `ingredient_substitutes`), picked from the
 * substitutes' lookup.
 */
export interface SubstituteListEntry extends ListEntry {
  link?: SubstituteLink;
  /** The form of the linked ingredient picked, when the substitute is that form alone. */
  variantId?: string;
}

/**
 * The curated deity a pick links, with the tradition its pill reads beside
 * the name, "Hecate (Greek)", and the description its tooltip carries
 *. Only the id is sent.
 */
export interface DeityLink {
  id: string;
  tradition: string | null;
  description: string | null;
}

/** One deity: typed text, or a link to the curated deity picked, whose name is `value`. */
export interface DeityListEntry extends ListEntry {
  link?: DeityLink;
}

/**
 * A source a reference row links: its id, which is sent, its tier, which the
 * row says, and the fields its short form is made of, which the row shows.
 */
export interface ReferenceLink extends ShortCitationFields {
  id: string;
  /** The compendium's, rather than this coven's own. */
  isGlobal: boolean;
}

/**
 * One reference: the source's citation, which the row is described
 * by and is never sent, the source it links, and the locator typed beside
 * it, "p. 112".
 */
export interface ReferenceListEntry extends ListEntry {
  link: ReferenceLink;
  locator: string;
}

/** A source the references' search offers: its citation, and the source a pick links. */
export interface ReferenceOption extends ComboboxOption {
  link: ReferenceLink;
}

/** A source saved by the panel, as `createReference` and `updateReference` answer it. */
export type SavedReference = CreateReferenceMutation['createReference'];

/** Any list's entry: typed text, or a substitute's or a deity's link beside it. */
export type AnyListEntry = ListEntry | SubstituteListEntry | DeityListEntry;

/**
 * A list box's suggestion: a substitute's carries the ingredient a pick
 * links, and a curated deity's the deity.
 */
export interface ListOption extends ComboboxOption {
  link?: SubstituteLink | DeityLink;
  /**
   * The form of the linked ingredient a pick names: a variant's substitute
   * rows offer each form of an ingredient on its own.
   */
  variantId?: string;
}

/** What `renamedTo` reads of a variant: its text, and the pick beside it. */
export type RenamedFormHolder = Pick<VariantFormValues, 'form' | 'formLink'>;

/**
 * The curated form a pick links: its id, which is sent, the name it was picked as, which the text
 * must stay for the pick to hold, and the group and description the box shows beside it.
 */
export interface FormLink {
  id: string;
  name: string;
  group: string | null;
  /** The group's icon name, or null for a group without one or a form with no group: `FormIcon` draws the generic. */
  icon: FormGroupIcon | null;
  description: string | null;
}

/** A form suggestion: a curated row's carries the form a pick links. */
export interface FormOption extends ComboboxOption {
  link?: FormLink;
}

/**
 * The form's own state: every field as typed, a closed set unanswered as `''`
 * or, holding several, as none chosen,
 * and what sits in each list's box, not yet added.
 */
export interface IngredientFormValues {
  name: string;
  nomenclature: NomenclatureKind | '';
  canonicalName: string;
  folkNames: FolkNameListEntry[];
  description: string;
  /** In the order chosen; none chosen is the answer "none". */
  elements: IngredientElement[];
  celestialBodies: ListEntry[];
  zodiacSigns: ListEntry[];
  colors: ListEntry[];
  deities: DeityListEntry[];
  substitutes: SubstituteListEntry[];
  /** The ids of the categories picked, in the order picked. */
  categoryIds: string[];
  safetyNotes: string;
  /** Whether the ingredient is toxic: its own flag, never read from a form. */
  toxic: boolean;
  /** Picked from the search, never typed, so not one of the lists. */
  references: ReferenceListEntry[];
  /** The new reference panel is open: a save waits until it is saved or cancelled. */
  referencePanelOpen: boolean;
  /** The forms it comes in, each with what it adds to the ingredient. */
  variants: VariantFormValues[];
  drafts: Record<DraftName, string>;
}

/**
 * A box whose text is not yet an entry: a list's, the references' search, or
 * the New Form box, whose text is not yet a variant.
 */
export type DraftName = IngredientListName | 'references' | 'variants';

/**
 * One form the ingredient comes in, as the form edits it (DESIGN.md §5, `ingredient_variants`):
 * its form, picked or typed, and what that form adds to the ingredient, never overrides.
 */
export interface VariantFormValues {
  /**
   * The row an edit opened it from, sent back as the input's `id` so a
   * respelt form keeps its row; absent for a form added here. Not `id`,
   * which `useFieldArray` keys its rows by.
   */
  variantId?: string;
  form: string;
  /** The curated form picked, while the text is still its name; null for typed text. */
  formLink: FormLink | null;
  description: string;
  safetyNotes: string;
  /** Whether this form is toxic: its own flag, never the ingredient's. */
  toxic: boolean;
  elements: IngredientElement[];
  celestialBodies: ListEntry[];
  zodiacSigns: ListEntry[];
  colors: ListEntry[];
  substitutes: SubstituteListEntry[];
  categoryIds: string[];
  references: ReferenceListEntry[];
  referencePanelOpen: boolean;
  drafts: Record<VariantDraftName, string>;
}

/** A variant's lists that take entries in a box: its own celestial bodies, signs, colours and substitutes. */
export type VariantListName = (typeof VARIANT_LISTS)[number];

/** A variant's boxes: its lists', and its references' search. */
export type VariantDraftName = VariantListName | 'references';

/** Where a variant's fields sit in the form's values: `variants.1`. */
export type VariantPath = `variants.${number}`;

/** One save as the form sends it: the input, and whether the redirect question was answered to end it. */
export interface IngredientSend {
  input: IngredientFormInput;
  endRedirect: boolean;
  revision?: number;
}

/** A save the server asked to confirm: what it said, and the input to send again. */
export interface RedirectQuestion {
  message: string;
  input: IngredientFormInput;
}

/**
 * What the form sends: its values in the shape the shared schema and the
 * mutation take, unparsed, its forms always listed, as every input type
 * requires them.
 */
export type IngredientFormInput = z.input<typeof LocalIngredientInput> & {
  variants: NonNullable<z.input<typeof LocalIngredientInput>['variants']>;
};

export type TextFieldName =
  | 'name'
  | 'canonicalName'
  | 'description'
  | 'safetyNotes'
  | `${VariantPath}.${'form' | 'description' | 'safetyNotes'}`;

/** An on-or-off flag: the ingredient's toxic flag, or a variant's. */
export type ToggleFieldName = 'toxic' | `${VariantPath}.toxic`;

export interface ToggleFieldProps {
  name: ToggleFieldName;
  label: string;
  /** What the switch is for, behind an info tip beside the label. */
  hint?: string;
}

/** A closed set holding several values: an entry's elements, or a variant's. */
export type MultiSelectFieldName = 'elements' | `${VariantPath}.elements`;

/** The ingredient's own lists that take entries in a box. */
export type IngredientListName = (typeof LIST_FIELDS)[number];

/** A list taking entries in a box: the ingredient's, or a variant's, `variants.1.celestialBodies`. */
export type ListFieldName = IngredientListName | `${VariantPath}.${VariantListName}`;

/** A list's box, as `draftOf` names it: `drafts.celestialBodies`, or `variants.1.drafts.celestialBodies`. */
export type DraftPath = `drafts.${DraftName}` | `${VariantPath}.drafts.${VariantDraftName}`;

/** A closed set holding several values, chosen as chips on the select-only box. */
export interface MultiSelectFieldProps extends FieldProps {
  name: MultiSelectFieldName;
  /** Shown while nothing is chosen, and not itself a choice. */
  placeholder?: string;
  options: readonly SelectOption[];
  /** At the right end of the label row: a variant's Copy From Ingredient. */
  action?: ReactNode;
}

/** A text field whose box suggests as it is typed in; picking fills it. */
export interface SuggestFieldProps<O extends ComboboxOption = ComboboxOption> extends FieldProps {
  name: TextFieldName;
  /** A short action shown, muted, while the box is empty: "Add a form". */
  placeholder?: string;
  suggestions: Suggestions<O>;
  /** The box has been focused: the lookup may start asking. */
  onActivate: () => void;
  /** A suggestion picked, after the text is filled from it, or the typed row, with `null`. */
  onPick?: (option: O | null) => void;
  /** The text typed, after the field takes it. */
  onEdit?: (text: string) => void;
  /** What a pick leaves out of the text, drawn in the box: a picked form's group. */
  qualifier?: ComboboxQualifier;
  /** A mark drawn before the text, decorative: a picked form's group icon. */
  icon?: ReactNode;
  /** Whether the typed row is offered: false for a box whose text must be a pick. */
  offerTyped?: boolean;
  /** The mark on the typed row: a form's is the generic. */
  typedIcon?: ReactNode;
  /** Drawn beneath the field's error: a renamed form's two answers. */
  after?: ReactNode;
}

export interface ListFieldProps {
  name: ListFieldName;
  /** The group's legend: "Folk Names". */
  legend: string;
  /** One entry, singular: the box's label, and its Add button's name, "Add Folk Name". */
  entry: string;
  /** What the list is for, behind an info tip beside the legend. */
  hint?: string;
  /** A short action shown, muted, while the box is empty: "Add a body". */
  placeholder?: string;
  /** What the box suggests; left out for a list with no source, whose box never opens. */
  suggestions?: Suggestions<ListOption>;
  /** The box has been focused: the lookup may start asking. */
  onActivate?: () => void;
  /** The list keeps the order entered, so its entries can be moved. */
  ordered?: boolean;
  /**
   * An entry is only ever a curated suggestion picked: the box offers the
   * curated rows alone, no typed row and no Add — a compendium entry's
   * celestial bodies, signs and deities.
   */
  pickOnly?: boolean;
  /** A control at the right end of the legend, handed the list's announcer: a variant's Copy From Ingredient. */
  action?: LegendAction;
  /** Drawn beneath the box and its error: a variant's notice of the substitutes a copy skipped. */
  after?: ReactNode;
  /**
   * A button on a chip, before its x, given the entry it is for: the folk
   * names' promote. Returns undefined for a chip with none.
   */
  rowAction?: (entry: AnyListEntry) => EntryAction | undefined;
  /**
   * The coven a linked substitute's summary reads its entry from, as the
   * lookups do; null, the default, for the compendium alone.
   */
  workspaceId?: string | null;
}

/** A linked substitute's summary: the ingredient and the form of it the entry names, and the coven asking. */
export interface SubstituteSummaryProps {
  link: SubstituteLink;
  variantId?: string;
  workspaceId: string | null;
}

/**
 * The new reference panel's own values: each text field as typed, a day as
 * `YYYY-MM-DD` or blank, and the kind `''` until one is chosen.
 */
export interface ReferenceFormValues {
  kind: ReferenceKind | '';
  title: string;
  authors: string;
  container: string;
  contributors: string;
  edition: string;
  volume: string;
  issue: string;
  series: string;
  place: string;
  publisher: string;
  published: string;
  pages: string;
  host: string;
  url: string;
  modified: string;
  accessed: string;
  note: string;
}

/** What the panel sends: its values as the shared schema and the mutation take them, unparsed. */
export type ReferenceSendInput = z.input<typeof ReferenceInput>;

/** A panel field other than the kind. */
export type ReferenceFieldName = Exclude<keyof ReferenceFormValues, 'kind'>;

/**
 * One field a kind shows: what it writes and what it is called there. No
 * hint: how to cite is the panel's one How to Cite tip.
 */
export interface ReferenceFieldSpec {
  name: ReferenceFieldName;
  label: string;
  /** Shown while the field is empty: an action ("Add a title"), or an example where the format matters ("2nd ed."). */
  placeholder?: string;
  required?: boolean;
  type?: 'date' | 'url';
}

/** Where a reference panel tells the ingredient form whether it holds unsaved edits. */
export interface PanelChanges {
  report: (panel: string, changed: boolean) => void;
}

/** The edit's panel while it reads the source: the panel's props, the source to edit given. */
export interface EditSourcePanelProps extends ReferencePanelProps {
  editing: NonNullable<ReferencePanelProps['editing']>;
}

/** The panel's form itself: the panel's props, and the values it opens with. */
export interface PanelFormProps extends ReferencePanelProps {
  defaults: ReferenceFormValues;
}

/** What a copy leaves a variant's field as, and how many entries it added. */
export interface MergedCopy {
  next: unknown;
  added: number;
}

export interface ReferencePanelProps {
  /** The coven the new source is written to, or null for the compendium's. */
  workspaceId: string | null;
  /**
   * The source to edit, opened prefilled with every field it has and saved
   * through `updateReference` in its tier; absent, the panel writes a new one.
   */
  editing?: ReferenceLink | null;
  /** How many times the panel has been asked for: each takes the focus back to Kind. */
  summons: number;
  /** Called with the source once the server has saved it, new or edited. */
  onSaved: (reference: SavedReference) => void;
  onCancel: () => void;
}

/**
 * A field whose lookup asks about this coven's ingredients, or, with a null
 * coven, the compendium's alone.
 */
export interface LookupFieldProps {
  workspaceId: string | null;
}

/**
 * A field the ingredient and each of its variants both carry: the
 * references, or the categories. `at` is the variant's place in the values,
 * left out for the ingredient's own.
 */
export interface SharedFieldProps {
  at?: VariantPath;
  /** A control at the right end of the legend, handed the field's announcer: a variant's Copy From Ingredient. */
  action?: LegendAction;
}

/** A variant's Form field, whose text must be a curated pick on the compendium. */
export interface FormFieldProps extends LookupFieldProps {
  at: VariantPath;
  pickOnly?: boolean;
}

/**
 * The Variants section: every form the ingredient comes in, and the
 * New Form box that adds one. On the compendium a form is a pick, and so is
 * every vocabulary box inside a variant.
 */
export interface VariantsFieldProps extends LookupFieldProps {
  /** Its section's open state, which the form owns, as it does the other five's. */
  fold: SectionFold;
  /** Which of each variant's own sections are open, which the form owns too. */
  folds: VariantFolds;
}

/** One variant's group: its place in the list, whether it is the one open, and how to open, close or take it out. */
export interface VariantFieldsetProps extends LookupFieldProps {
  index: number;
  open: boolean;
  /** Opens it, closing any other, or closes it. */
  onToggle: (open: boolean) => void;
  /** Asks whether to remove it; its × does nothing else. */
  onRemove: () => void;
  /** Which of its sections are open, by its place in the list. */
  folds: VariantFolds;
}

/** What every lookup asks besides its scope: the settled text, and how many rows. */
export type LookupText = Pick<FormSuggestionsQueryVariables, 'query' | 'first'>;

/** A lookup's hook: the suggestions for the text, once settled, while the box is active. */
export type UseSuggestions<O extends ComboboxOption = ListOption> = (
  workspaceId: string | null,
  text: string,
  active: boolean,
) => Suggestions<O>;

/** A list field and the lookup its box suggests from. */
export interface LookupListFieldProps
  extends LookupFieldProps, Omit<ListFieldProps, 'suggestions' | 'onActivate' | 'workspaceId'> {
  useSuggestions: UseSuggestions;
  /** An ingredient the box never offers: the compendium entry being edited, as its own substitute. */
  omit?: string;
  /** Reorders what the lookup found, keeping each row: a variant's substitutes, its own form first. */
  rank?: (options: ListOption[]) => ListOption[];
}

/** A substitute list's second pickers: which form of each linked ingredient it names. */
export interface SubstituteFormsProps {
  name: `${'' | `${VariantPath}.`}substitutes`;
}

/** A celestial body or sign suggestion, as the lookup asks for it; a deity's adds its tradition. */
export type CorrespondenceNode =
  CelestialBodySuggestionsQuery['celestialBodySuggestions']['edges'][number]['node'];

/** The duplicate warning's state, which the form owns and the name field draws. */
export interface DuplicateWarning {
  /** The matches named, best first, less those dismissed. */
  shown: Duplicate[];
  /** A save is held on them: the warning is an error on the name. */
  blocking: boolean;
  /** Another name's answer is on its way, and the list shown is the last name's. */
  pending: boolean;
  /** The compendium entries named exactly as the held save's name: the question's, empty when none. */
  exact: Duplicate[];
  /** Asks about the name a save is sending, and holds it, answering true, when a match is not dismissed. */
  check: (name: string) => Promise<boolean>;
  /** Sets the matches shown aside and lifts the hold. */
  dismiss: () => void;
  /** The coven now holds this compendium entry: its lookups are asked again, so it is listed as held. */
  added: (id: string) => Promise<void>;
}

export interface NameFieldProps {
  warning: DuplicateWarning;
  /** Where a match links: a coven's ingredient page, or the admin's compendium modal. */
  hrefOf: (match: Duplicate) => string;
  /**
   * Puts a compendium match in the cupboard (its +), answering whether it went in; left out where
   * there is no cupboard, the admin's, and no match offers it.
   */
  onUse?: (match: Duplicate) => Promise<boolean>;
  /** The coven's name, which the page status region says an add went to; "My Ingredients" when left out. */
  workspaceName?: string;
  /**
   * The coven the form adds to, whose held matches each open a Quick Look over the form,
   * read in it; left out on the admin's form, which has no coven.
   */
  workspaceId?: string;
  /**
   * A match's Quick Look, the details its list opens over the form; left out where the page under
   * the form has no details to open.
   */
  quickLookOf?: (match: Duplicate) => RouteModalLink;
  /** Whether a match holds a save, offering Create Anyway: a new entry's; an edit's only names its matches. True by default. */
  holds?: boolean;
  /** Create Anyway, while the warning shows, and null otherwise: a held save focuses it. */
  ref: Ref<HTMLButtonElement>;
}

/** An entry whose name is close to the one typed, as the duplicate warning names and links it. */
export type Duplicate = PossibleDuplicatesQuery['possibleDuplicates']['edges'][number]['node'];

/** An in-scope ingredient already holding a suggested value, as a lookup names it. */
export interface Claimant {
  name: string;
  canonicalName: string | null;
}

/** One of the ingredient's six sections, each folding to a summary line. */
export type SectionKey = (typeof SECTION_KEYS)[number];

/** The closed line of one of the ingredient's sections. */
export interface SectionSummaryProps {
  section: SectionKey;
}

/** A variant's own sections, the ingredient's bar Variants, each folding as the ingredient's do. */
export type VariantSectionKey = (typeof VARIANT_SECTION_KEYS)[number];

/** Each variant's open sections, by its place in the list, as `useVariantFolds` holds them. */
export type VariantFoldList = readonly ReadonlySet<VariantSectionKey>[];

/**
 * Which of each variant's sections are open, by the variant's place in the list. The form owns it
 * so that Save and Open All / Close All reach them; a variant not yet seen has every one closed.
 */
export interface VariantFolds {
  /** The one variant card open, by its place; the rest are a line each. The form owns it so a restore can open one. */
  card: number | null;
  setCard: (update: number | null | ((now: number | null) => number | null)) => void;
  isOpen: (index: number, section: VariantSectionKey) => boolean;
  toggle: (index: number, section: VariantSectionKey) => void;
  /** A variant added first in the list, as the New Form box adds one, with every section open. */
  added: () => void;
  removed: (index: number) => void;
  /** Every section of each of `count` variants opened, or closed. */
  setAll: (open: boolean, count: number) => void;
  /** Opens, in each variant, the sections the map names, keyed by its place. */
  openErring: (erring: ReadonlyMap<number, ReadonlySet<VariantSectionKey>>) => void;
  /** Opens a variant's card and the sections of it a restore changed. */
  reveal: (index: number, sections: ReadonlySet<VariantSectionKey>) => void;
  /**
   * Re-keys the folds to a restored list: a row kept keeps its folds, one that returns opens fully,
   * one gone is dropped; rows match by `variantId`, else form. Returns the first returned place or -1.
   */
  reconcile: (from: readonly RestoredVariant[], to: readonly RestoredVariant[]) => number;
}

/** What a restore has to open to show the fields it changed. */
export interface RestoredSections {
  /** The ingredient's own sections, Variants among them when a variant changed. */
  sections: Set<SectionKey>;
  /** Each changed variant, by its place, and the sections of it that hold a change. */
  variants: Map<number, Set<VariantSectionKey>>;
}

/** What a restore needs to tell one variant from another. */
export interface RestoredVariant {
  variantId?: string;
  form: string;
}

/** A variant's field that its Copy From Ingredient fills from the ingredient's own. */
/** A field the form counts or names the entries of: `FIELD_NOUNS`'s keys. */
export type NounedField = CopiedField | 'folkNames' | 'deities' | 'variants';

/** What a field is called: its label, as its button names it, and one entry and several, as a count says them. */
export interface FieldNoun {
  label: string;
  one: string;
  many: string;
}

export type CopiedField =
  | 'description'
  | 'safetyNotes'
  | 'elements'
  | 'celestialBodies'
  | 'zodiacSigns'
  | 'colors'
  | 'categoryIds'
  | 'substitutes'
  | 'references';

/** A variant's Copy From Ingredient, for one of its fields. */
export interface CopyFromIngredientProps {
  at: VariantPath;
  field: CopiedField;
  /** The field's own live region, where it has one; else the button says what it did through its own. */
  announce?: Announce;
  /**
   * A variant's substitutes only: told what a copy skipped, the ingredient's
   * links in no form like the variant's, and how to say what Copy Anyway does.
   */
  onSkip?: (skipped: SkippedCopy) => void;
  /** The button, which takes the focus back when the notice of what was skipped goes. */
  buttonRef?: Ref<HTMLButtonElement>;
}

/**
 * What a variant's substitute copy left out: the links to an ingredient in no form like the
 * variant's, the list as the copy left it by `listKey`, and the list's announcer.
 */
export interface SkippedCopy {
  entries: SubstituteListEntry[];
  /** The variant's form as typed when the copy ran, which the notice names. */
  form: string;
  listKey: string;
  announce: Announce;
}

/** The notice beneath a variant's substitutes of what a copy skipped, with Copy Anyway. */
export interface SkippedNoticeProps {
  at: VariantPath;
  skipped: SkippedCopy | null;
  /** The notice is done with: Copy Anyway pressed, dismissed, or the list changed. */
  onDone: () => void;
  /** The variant's Copy From Ingredient, which takes the focus when the notice goes. */
  copyButton: RefObject<HTMLButtonElement | null>;
}

/** A variant's or a reference row's removal, asked before it goes. */
export interface RemoveQuestionProps {
  /** A removal is waiting on the answer. */
  asked: boolean;
  /** "Remove "Oil"? …", naming the row. */
  question: ReactNode;
  /** Removes the row and stops asking, both in the one commit. */
  onRemove: () => void;
  /** Where the focus goes once the row and the question have gone. */
  afterRemove: () => void;
  /** Stops asking, the row kept. */
  onKeep: () => void;
}

/** What `ReadFailure` takes: the failed read's error, and what Try Again does. */
export interface ReadFailureProps {
  error: unknown;
  onRetry: () => void;
}

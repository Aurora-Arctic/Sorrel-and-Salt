import type { HTMLInputTypeAttribute, ReactNode, Ref } from 'react';
import type { FieldPath, FieldValues } from 'react-hook-form';
import type { z } from 'zod';
import type {
  CreateReferenceMutation,
  CreateWorkspaceIngredientMutation,
  FormSuggestionsQueryVariables,
  PlanetSuggestionsQuery,
  PossibleDuplicatesQuery,
} from '../../gql/graphql';
import type {
  INGREDIENT_ELEMENTS,
  NomenclatureKind,
  ReferenceKind,
} from '@/modules/ingredients/schema/ingredient-enums';
import type { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';
import type { ReferenceInput } from '@/modules/ingredients/validation/reference';
import type { ComboboxQualifier, ComboboxOption, Suggestions } from '../Combobox/types';

interface IngredientFormCallbacks {
  /**
   * Called with the saved row once the server has accepted it, and which save
   * was pressed: 'open', Save Ingredient, for the page to open the
   * ingredient; 'another', Save & Add Another, after which the form clears.
   */
  onSaved?: (ingredient: SavedIngredient, next: AfterSave) => void;
  /** Called once the entry given has been deleted. */
  onDeleted?: () => void;
  /** Cancel, offered beside the saves when given: the page the form sits in closes it. */
  onCancel?: () => void;
  /** Where a near match the duplicate warning names links, when not a coven's ingredient page. */
  duplicateHref?: (match: Duplicate) => string;
}

/**
 * Where the form writes. A coven's new ingredient, to the coven named; or,
 * with a null `workspaceId`, a compendium entry (M5.5) — a new one, or the
 * `entry` given, which it saves over and can delete. A coven's edit is
 * M8.16's, so the props cannot say one yet.
 */
export type IngredientFormProps = IngredientFormCallbacks &
  ({ workspaceId: string; entry?: never } | { workspaceId: null; entry?: EditedIngredient });

/** The ingredient an edit opens: its id, which the writes name, and its values as the form shows them. */
export interface EditedIngredient {
  id: string;
  values: IngredientFormValues;
}

/** What follows a save: the new ingredient opened, or the form cleared for another. */
export type AfterSave = 'open' | 'another';

export type SavedIngredient = CreateWorkspaceIngredientMutation['createWorkspaceIngredient'];

export type IngredientElement = (typeof INGREDIENT_ELEMENTS)[number];

/** One entry of a list field: `useFieldArray` keys objects, never bare strings. */
export interface ListEntry {
  value: string;
}

/**
 * The ingredient a substitute links, with the formal name its pill reads
 * beside the label, and what its tooltip adds: its form, its tier and its
 * description (MB.164). Only the id is sent.
 */
export interface SubstituteLink {
  id: string;
  canonicalName: string | null;
  form: string | null;
  description: string | null;
  /** A compendium entry, rather than this coven's own. */
  isGlobal: boolean;
}

/**
 * One substitute: typed text, or a link to an ingredient, whose label is
 * `value` (DESIGN.md §5, `ingredient_substitutes`), picked from the
 * substitutes' lookup (MB.131).
 */
export interface SubstituteListEntry extends ListEntry {
  link?: SubstituteLink;
}

/**
 * The curated deity a pick links, with the tradition its pill reads beside
 * the name, "Hecate (Greek)", and the description its tooltip carries
 * (MB.169). Only the id is sent.
 */
export interface DeityLink {
  id: string;
  tradition: string | null;
  description: string | null;
}

/** One deity: typed text, or a link to the curated deity picked, whose name is `value` (MB.167). */
export interface DeityListEntry extends ListEntry {
  link?: DeityLink;
}

/** A source a reference row links: its id, which is sent, and its tier, which the row says. */
export interface ReferenceLink {
  id: string;
  /** The compendium's, rather than this coven's own. */
  isGlobal: boolean;
}

/**
 * One reference (MB.154): the source's citation, which the row reads and is
 * never sent, the source it links, and the locator typed beside it, "p. 112".
 */
export interface ReferenceListEntry extends ListEntry {
  link: ReferenceLink;
  locator: string;
}

/** A source the references' search offers: its citation, and the source a pick links. */
export interface ReferenceOption extends ComboboxOption {
  link: ReferenceLink;
}

/** A source saved by the panel, as `createReference` answers it. */
export type SavedReference = CreateReferenceMutation['createReference'];

/** Any list's entry: typed text, or a substitute's or a deity's link beside it. */
export type AnyListEntry = ListEntry | SubstituteListEntry | DeityListEntry;

/**
 * A list box's suggestion: a substitute's carries the ingredient a pick
 * links, and a curated deity's the deity.
 */
export interface ListOption extends ComboboxOption {
  link?: SubstituteLink | DeityLink;
}

/**
 * The curated form a pick links (MB.169): its id, which is sent, the name it
 * was picked as, which the text must stay for the pick to hold, and the group
 * and description the box shows beside the text.
 */
export interface FormLink {
  id: string;
  name: string;
  group: string | null;
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
  form: string;
  /** The curated form picked, while the text is still its name; null for typed text. */
  formLink: FormLink | null;
  folkNames: ListEntry[];
  description: string;
  /** In the order chosen; none chosen is the answer "none". */
  elements: IngredientElement[];
  planets: ListEntry[];
  zodiacSigns: ListEntry[];
  colors: ListEntry[];
  deities: DeityListEntry[];
  substitutes: SubstituteListEntry[];
  /** The ids of the categories picked, in the order picked (MB.126). */
  categoryIds: string[];
  safetyNotes: string;
  /** Picked from the search, never typed, so not one of the lists (MB.154). */
  references: ReferenceListEntry[];
  /** The new reference panel is open: a save waits until it is saved or cancelled. */
  referencePanelOpen: boolean;
  drafts: Record<DraftName, string>;
}

/** A box whose text is not yet an entry: a list's, or the references' search. */
export type DraftName = ListFieldName | 'references';

/** A save the server asked to confirm (MB.82): what it said, and the input to send again. */
export interface RedirectQuestion {
  message: string;
  input: IngredientFormInput;
}

/** What the form sends: its values in the shape the shared schema and the mutation take, unparsed. */
export type IngredientFormInput = z.input<typeof LocalIngredientInput>;

export type TextFieldName = 'name' | 'canonicalName' | 'form' | 'description' | 'safetyNotes';

/** A closed set holding several values: an entry's elements. */
export type MultiSelectFieldName = 'elements';

export type ListFieldName =
  'folkNames' | 'planets' | 'zodiacSigns' | 'colors' | 'deities' | 'substitutes';

/** What every field shares: what it is called, and what it is told about it. */
interface FieldProps {
  label: string;
  /** What the field is for, behind an info tip beside the label. */
  hint?: string;
  /** A state the field is in — why it is shut — as a line beneath the label, never tucked away. */
  note?: string;
  /** Marked required beside its label, and to assistive technology. */
  required?: boolean;
}

/**
 * A text field, in the ingredient form or another one providing it: the
 * reference panel's (MB.154). Its name is one of that form's paths.
 */
export interface TextFieldProps<V extends FieldValues = IngredientFormValues> extends FieldProps {
  name: FieldPath<V>;
  /** A textarea, for prose. */
  multiline?: boolean;
  /** The input's type, for a single line: a reference's days are `date`s. */
  type?: Extract<HTMLInputTypeAttribute, 'text' | 'date' | 'url'>;
  /** Shut, for a field the rest of the form has ruled out; its hint says why. */
  disabled?: boolean;
  /** Fields whose errors this one's value decides as well, revalidated when it changes. */
  deps?: FieldPath<V>[];
  /** Another element read with the field while it shows: the name's duplicate warning. */
  describedBy?: string;
  /** Marked invalid by something other than its own error: the name's held duplicate warning. */
  invalid?: boolean;
  /** Drawn beneath the field, after its error: the name's duplicate warning. */
  after?: ReactNode;
  /** How the text is tidied as the field is left: a reference's fields, as the server will store them. */
  format?: (text: string) => string;
  /** The browser's autofill: `off` for the name, which Chrome otherwise takes for a person's. */
  autoComplete?: 'off';
}

/** A closed set, in the ingredient form or the reference panel's, whose kind is one. */
export interface SelectFieldProps<V extends FieldValues = IngredientFormValues> extends FieldProps {
  name: FieldPath<V>;
  /** Shown until a choice is made, and not itself a choice. */
  placeholder?: string;
  options: readonly SelectOption[];
  deps?: FieldPath<V>[];
  /** Runs on a new choice, before the field and its `deps` revalidate. */
  onChange?: (value: string) => void;
}

/** A closed set holding several values, chosen as chips on the select-only box. */
export interface MultiSelectFieldProps extends FieldProps {
  name: MultiSelectFieldName;
  /** Shown while nothing is chosen, and not itself a choice. */
  placeholder?: string;
  options: readonly SelectOption[];
}

export interface SelectOption {
  value: string;
  label: string;
}

/** A text field whose box suggests as it is typed in; picking fills it. */
export interface SuggestFieldProps<O extends ComboboxOption = ComboboxOption> extends FieldProps {
  name: TextFieldName;
  suggestions: Suggestions<O>;
  /** The box has been focused: the lookup may start asking. */
  onActivate: () => void;
  /** A suggestion picked, after the text is filled from it, or the typed row, with `null`. */
  onPick?: (option: O | null) => void;
  /** The text typed, after the field takes it. */
  onEdit?: (text: string) => void;
  /** What a pick leaves out of the text, drawn in the box: a picked form's group. */
  qualifier?: ComboboxQualifier;
  /** Whether the typed row is offered: false for a box whose text must be a pick. */
  offerTyped?: boolean;
}

export interface ListFieldProps {
  name: ListFieldName;
  /** The group's legend: "Folk Names". */
  legend: string;
  /** One entry, singular: the box's label, and its Add button's name, "Add Folk Name". */
  entry: string;
  /** What the list is for, behind an info tip beside the legend. */
  hint?: string;
  /** What the box suggests; left out for a list with no source, whose box never opens. */
  suggestions?: Suggestions<ListOption>;
  /** The box has been focused: the lookup may start asking. */
  onActivate?: () => void;
  /** The list keeps the order entered, so its entries can be moved (MB.170). */
  ordered?: boolean;
  /**
   * An entry is only ever a curated suggestion picked: the box offers the
   * curated rows alone, no typed row and no Add — a compendium entry's
   * planets, signs and deities (MB.162).
   */
  pickOnly?: boolean;
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

/** One field a kind shows: what it writes, what it is called there, and what it is told. */
export interface ReferenceFieldSpec {
  name: ReferenceFieldName;
  label: string;
  hint?: string;
  required?: boolean;
  type?: 'date' | 'url';
}

export interface ReferencePanelProps {
  /** The coven the new source is written to, or null for the compendium's. */
  workspaceId: string | null;
  /** How many times the panel has been asked for: each takes the focus back to Kind. */
  summons: number;
  /** Called with the source once the server has saved it. */
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

/** The form field's lookup, whose text must be a curated pick on the compendium (MB.162). */
export interface FormFieldProps extends LookupFieldProps {
  pickOnly?: boolean;
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
  extends LookupFieldProps, Omit<ListFieldProps, 'suggestions' | 'onActivate'> {
  useSuggestions: UseSuggestions;
  /** An ingredient the box never offers: the compendium entry being edited, as its own substitute. */
  omit?: string;
}

/** A planet or sign suggestion, as the lookup asks for it; a deity's adds its tradition. */
export type CorrespondenceNode =
  PlanetSuggestionsQuery['planetSuggestions']['edges'][number]['node'];

/** The duplicate warning's state, which the form owns and the name field draws. */
export interface DuplicateWarning {
  /** The matches named, best first, less those dismissed. */
  shown: Duplicate[];
  /** A save is held on them: the warning is an error on the name. */
  blocking: boolean;
  /** Asks about the name a save is sending, and holds it, answering true, when a match is not dismissed. */
  check: (name: string) => Promise<boolean>;
  /** Sets the matches shown aside and lifts the hold. */
  dismiss: () => void;
}

export interface NameFieldProps {
  warning: DuplicateWarning;
  /** Where a match links: by default a coven's ingredient page; the admin's compendium page opens its own modal. */
  hrefOf?: (match: Duplicate) => string;
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

export interface FieldErrorProps {
  id: string;
  message?: string;
}

export interface FieldShellProps extends FieldProps {
  controlId: string;
  labelId: string;
  hintId: string;
  noteId: string;
  errorId: string;
  error?: string;
  children: ReactNode;
  /** Beneath the error: what a field adds of its own. */
  after?: ReactNode;
}

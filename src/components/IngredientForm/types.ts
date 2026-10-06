import type { ReactNode, Ref } from 'react';
import type { z } from 'zod';
import type {
  CreateWorkspaceIngredientMutation,
  FormSuggestionsQueryVariables,
  PlanetSuggestionsQuery,
  PossibleDuplicatesQuery,
} from '../../gql/graphql';
import type {
  INGREDIENT_ELEMENTS,
  NomenclatureKind,
} from '@/modules/ingredients/schema/ingredient-enums';
import type { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';
import type { ComboboxQualifier, ComboboxOption, Suggestions } from '../Combobox/types';

export interface IngredientFormProps {
  /** The coven the new ingredient is written to. */
  workspaceId: string;
  /** Called with the saved row once the server has accepted it. */
  /**
   * Called with the saved row once the server has accepted it, and which save
   * was pressed: 'open', Save Ingredient, for the page to open the new
   * ingredient; 'another', Save & Add Another, after which the form clears.
   */
  onSaved?: (ingredient: SavedIngredient, next: AfterSave) => void;
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
  safetyNotes: string;
  drafts: Record<ListFieldName, string>;
}

/** What the form sends: its values in the shape the shared schema and the mutation take, unparsed. */
export type IngredientFormInput = z.input<typeof LocalIngredientInput>;

export type TextFieldName = 'name' | 'canonicalName' | 'form' | 'description' | 'safetyNotes';

export type SelectFieldName = 'nomenclature';

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

export interface TextFieldProps extends FieldProps {
  name: TextFieldName;
  /** A textarea, for prose. */
  multiline?: boolean;
  /** Shut, for a field the rest of the form has ruled out; its hint says why. */
  disabled?: boolean;
  /** Fields whose errors this one's value decides as well, revalidated when it changes. */
  deps?: (TextFieldName | SelectFieldName)[];
  /** Another element read with the field while it shows: the name's duplicate warning. */
  describedBy?: string;
  /** Marked invalid by something other than its own error: the name's held duplicate warning. */
  invalid?: boolean;
  /** Drawn beneath the field, after its error: the name's duplicate warning. */
  after?: ReactNode;
}

export interface SelectFieldProps extends FieldProps {
  name: SelectFieldName;
  /** Shown until a choice is made, and not itself a choice. */
  placeholder?: string;
  options: readonly SelectOption[];
  deps?: (TextFieldName | SelectFieldName)[];
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
}

/** A field whose lookup asks about this coven's ingredients. */
export interface LookupFieldProps {
  workspaceId: string;
}

/** What every lookup is asked: the coven, the settled text, and how many rows. */
export type LookupVariables = FormSuggestionsQueryVariables;

/** A list field and the lookup its box suggests from. */
export interface LookupListFieldProps
  extends LookupFieldProps, Omit<ListFieldProps, 'suggestions' | 'onActivate'> {
  useSuggestions: (workspaceId: string, text: string, active: boolean) => Suggestions<ListOption>;
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

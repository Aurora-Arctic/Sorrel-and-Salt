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
  NameBasis,
  NomenclatureKind,
  ReferenceKind,
} from '@/modules/ingredients/schema/ingredient-enums';
import type { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';
import type { ReferenceInput } from '@/modules/ingredients/validation/reference';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import type { ComboboxOption, EntryAction, Suggestions } from '../Combobox/types';
import type { FieldProps, SelectOption } from '../Field/types';
import type { Announce, LegendAction } from '../CategoryPicker/types';
import type { ShortCitationFields } from '@/lib/types';
// A type import of a value, which brings nothing into the bundle.
import type { LIST_FIELDS, SECTION_KEYS, VARIANT_LISTS, VARIANT_SECTION_KEYS } from './values';

interface IngredientFormCallbacks {
  onSaved?: (ingredient: SavedIngredient, next: AfterSave) => void;
  /** Called once, when an autosave has created a new ingredient. Not called by Save or Close. */
  onCreated?: (ingredient: SavedIngredient) => void;
  /** Called when an autosave has written to an existing ingredient. Not called for the
   * creating autosave, nor by Save or Close. */
  onAutosaved?: (ingredient: SavedIngredient) => void;
  /** Called after another save changed the ingredient. Left out, the page reloads. */
  onReload?: () => void;
  onDeleted?: () => void;
  duplicateHref: (match: Duplicate) => string;
  quickLookOf?: (match: Duplicate) => RouteModalLink;
  entryHref?: EntryHref;
  mayPromote?: boolean;
  review?: ReviewOffer;
  sourcesIntro?: ReactNode;
}

export interface ReviewOffer {
  reviewed: boolean;
  /** When, as an ISO moment, if the page has it; an add has none. */
  reviewedAt?: string | null;
  shown?: boolean;
}

export type EntryHref = (ingredient: { slug: string; isGlobal: boolean }) => string | undefined;

export type IngredientFormProps = IngredientFormCallbacks &
  (
    | {
        workspaceId: string;
        entry?: EditedIngredient;
        workspaceName?: string;
      }
    | { workspaceId: null; entry?: EditedIngredient; workspaceName?: undefined }
  );

export interface EditedIngredient {
  id: string;
  values: IngredientFormValues;
  /** The revision the page read, which the first save names so a change made since is not written over. */
  revision?: number | null;
  /** When the page read it saved, as an ISO moment: a copy kept in the browser is offered back only if newer. */
  updatedAt?: string | null;
}

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

interface FolkNameListEntry extends ListEntry {
  id?: string;
}

export interface SubstituteLink {
  id: string;
  canonicalName: string | null;
  forms: string[];
  description: string | null;
  /** A compendium entry, rather than this coven's own. */
  isGlobal: boolean;
  variants?: SubstituteForm[];
}

export interface SubstituteForm {
  id: string;
  form: string;
  group: string | null;
}

export interface SubstituteListEntry extends ListEntry {
  link?: SubstituteLink;
  variantId?: string;
}

export interface DeityLink {
  id: string;
  tradition: string | null;
  description: string | null;
}

interface DeityListEntry extends ListEntry {
  link?: DeityLink;
}

export interface ReferenceLink extends ShortCitationFields {
  id: string;
  /** The compendium's, rather than this coven's own. */
  isGlobal: boolean;
}

/**
 * One reference: the source's citation (described by, never sent), the source it links, and the locator typed beside
 * it, "p. 112". On the compendium's form, also how the source names the ingredient (`''` until chosen) and the fields
 * it supports; a coven's form leaves both empty.
 */
export interface ReferenceListEntry extends ListEntry {
  link: ReferenceLink;
  locator: string;
  nameBasis: NameBasis | '';
  supports: string[];
}

export interface ReferenceOption extends ComboboxOption {
  link: ReferenceLink;
}

export type SavedReference = CreateReferenceMutation['createReference'];

export type AnyListEntry = ListEntry | SubstituteListEntry | DeityListEntry;

export interface ListOption extends ComboboxOption {
  link?: SubstituteLink | DeityLink;
  variantId?: string;
}

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

export interface FormOption extends ComboboxOption {
  link?: FormLink;
}

/** The form's own state: every field as typed, a closed set unanswered as `''` or,
 * holding several, as none chosen. */
export interface IngredientFormValues {
  name: string;
  nomenclature: NomenclatureKind | '';
  canonicalName: string;
  folkNames: FolkNameListEntry[];
  description: string;
  elements: IngredientElement[];
  celestialBodies: ListEntry[];
  zodiacSigns: ListEntry[];
  colors: ListEntry[];
  deities: DeityListEntry[];
  substitutes: SubstituteListEntry[];
  categoryIds: string[];
  safetyNotes: string;
  /** Whether the ingredient is toxic: its own flag, never read from a form. */
  toxic: boolean;
  /** Picked from the search, never typed, so not one of the lists. */
  references: ReferenceListEntry[];
  /** The new reference panel is open: a save waits until it is saved or cancelled. */
  referencePanelOpen: boolean;
  variants: VariantFormValues[];
  drafts: Record<DraftName, string>;
}

type DraftName = IngredientListName | 'references' | 'variants';

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

type VariantListName = (typeof VARIANT_LISTS)[number];

type VariantDraftName = VariantListName | 'references';

export type VariantPath = `variants.${number}`;

export interface IngredientSend {
  input: IngredientFormInput;
  endRedirect: boolean;
  revision?: number;
  shown?: boolean;
}

export interface RedirectQuestion {
  message: string;
  input: IngredientFormInput;
}

/** What the form sends: its values in the shape the shared schema and the mutation take,
 * unparsed, its forms always listed, as every input type requires them. */
export type IngredientFormInput = z.input<typeof LocalIngredientInput> & {
  variants: NonNullable<z.input<typeof LocalIngredientInput>['variants']>;
};

type ToggleFieldName = 'toxic' | `${VariantPath}.toxic`;

export interface ToggleFieldProps {
  name: ToggleFieldName;
  label: string;
  hint?: string;
}

export type MultiSelectFieldName =
  'elements' | `${VariantPath}.elements` | `${ReferenceListName}.${number}.supports`;

type ReferenceListName = 'references' | `${VariantPath}.references`;

export type IngredientListName = (typeof LIST_FIELDS)[number];

export type ListFieldName = IngredientListName | `${VariantPath}.${VariantListName}`;

export type DraftPath = `drafts.${DraftName}` | `${VariantPath}.drafts.${VariantDraftName}`;

export interface MultiSelectFieldProps extends FieldProps {
  name: MultiSelectFieldName;
  placeholder?: string;
  options: readonly SelectOption[];
  action?: ReactNode;
}

export interface ListFieldProps {
  name: ListFieldName;
  legend: string;
  entry: string;
  hint?: string;
  placeholder?: string;
  /** What the box suggests; left out for a list with no source, whose box never opens. */
  suggestions?: Suggestions<ListOption>;
  onActivate?: () => void;
  /** The list keeps the order entered, so its entries can be moved. */
  ordered?: boolean;
  pickOnly?: boolean;
  action?: LegendAction;
  after?: ReactNode;
  rowAction?: (entry: AnyListEntry) => EntryAction | undefined;
  workspaceId?: string | null;
}

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
  scholarly: boolean;
}

export type ReferenceSendInput = z.input<typeof ReferenceInput>;

export type ReferenceFieldName = Exclude<keyof ReferenceFormValues, 'kind' | 'scholarly'>;

export interface ReferenceFieldSpec {
  name: ReferenceFieldName;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: 'date' | 'url';
  inputMode?: 'url';
}

export interface PanelChanges {
  report: (panel: string, changed: boolean) => void;
}

export interface EditSourcePanelProps extends ReferencePanelProps {
  editing: NonNullable<ReferencePanelProps['editing']>;
}

export interface PanelFormProps extends ReferencePanelProps {
  defaults: ReferenceFormValues;
}

export interface MergedCopy {
  next: unknown;
  added: number;
}

export interface ReferencePanelProps {
  workspaceId: string | null;
  editing?: ReferenceLink | null;
  /** How many times the panel has been asked for: each takes the focus back to Kind. */
  summons: number;
  onSaved: (reference: SavedReference) => void;
  onCancel: () => void;
}

export interface LookupFieldProps {
  workspaceId: string | null;
}

export interface SharedFieldProps {
  at?: VariantPath;
  action?: LegendAction;
}

/** A variant's Form field, whose text must be a curated pick on the compendium. */
export interface FormFieldProps extends LookupFieldProps {
  at: VariantPath;
  pickOnly?: boolean;
}

export interface VariantsFieldProps extends LookupFieldProps {
  fold: SectionFold;
  folds: VariantFolds;
}

export interface VariantFieldsetProps extends LookupFieldProps {
  index: number;
  open: boolean;
  onToggle: (open: boolean) => void;
  onRemove: () => void;
  folds: VariantFolds;
}

export type LookupText = Pick<FormSuggestionsQueryVariables, 'query' | 'first'>;

export type UseSuggestions<O extends ComboboxOption = ListOption> = (
  workspaceId: string | null,
  text: string,
  active: boolean,
) => Suggestions<O>;

export interface LookupListFieldProps
  extends LookupFieldProps, Omit<ListFieldProps, 'suggestions' | 'onActivate' | 'workspaceId'> {
  useSuggestions: UseSuggestions;
  /** An ingredient the box never offers: the compendium entry being edited, as its own substitute. */
  omit?: string;
  rank?: (options: ListOption[]) => ListOption[];
}

export interface SubstituteFormsProps {
  name: `${'' | `${VariantPath}.`}substitutes`;
}

export type CorrespondenceNode =
  CelestialBodySuggestionsQuery['celestialBodySuggestions']['edges'][number]['node'];

export interface DuplicateWarning {
  shown: Duplicate[];
  blocking: boolean;
  pending: boolean;
  exact: Duplicate[];
  check: (name: string) => Promise<boolean>;
  dismiss: () => void;
  /** The coven now holds this compendium entry: its lookups are asked again, so it is listed as held. */
  added: (id: string) => Promise<void>;
}

export interface NameFieldProps {
  warning: DuplicateWarning;
  hrefOf: (match: Duplicate) => string;
  /** Puts a compendium match in the cupboard (its +), answering whether it went in; left
   * out where there is no cupboard (the keeper's). */
  onUse?: (match: Duplicate) => Promise<boolean>;
  workspaceName?: string;
  workspaceId?: string;
  quickLookOf?: (match: Duplicate) => RouteModalLink;
  holds?: boolean;
  /** Create Anyway, while the warning shows, and null otherwise: a held save focuses it. */
  ref: Ref<HTMLButtonElement>;
}

export type Duplicate = PossibleDuplicatesQuery['possibleDuplicates']['edges'][number]['node'];

export interface Claimant {
  name: string;
  canonicalName: string | null;
}

export type SectionKey = (typeof SECTION_KEYS)[number];

export interface SectionSummaryProps {
  section: SectionKey;
}

export type VariantSectionKey = (typeof VARIANT_SECTION_KEYS)[number];

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
  added: () => void;
  removed: (index: number) => void;
  setAll: (open: boolean, count: number) => void;
  openErring: (erring: ReadonlyMap<number, ReadonlySet<VariantSectionKey>>) => void;
  reveal: (index: number, sections: ReadonlySet<VariantSectionKey>) => void;
  /** Re-keys the folds to a restored list: a kept row keeps its folds, a returned one opens
   * fully, a gone one is dropped. Rows match by `variantId`, else form. Returns the first
   * returned place or -1. */
  reconcile: (from: readonly RestoredVariant[], to: readonly RestoredVariant[]) => number;
}

export interface RestoredSections {
  sections: Set<SectionKey>;
  variants: Map<number, Set<VariantSectionKey>>;
}

export interface RestoredVariant {
  variantId?: string;
  form: string;
}

export type NounedField = CopiedField | 'folkNames' | 'deities' | 'variants';

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

export interface CopyFromIngredientProps {
  at: VariantPath;
  field: CopiedField;
  announce?: Announce;
  onSkip?: (skipped: SkippedCopy) => void;
  /** The button, which takes the focus back when the notice of what was skipped goes. */
  buttonRef?: Ref<HTMLButtonElement>;
}

export interface SkippedCopy {
  entries: SubstituteListEntry[];
  form: string;
  listKey: string;
  announce: Announce;
}

export interface SkippedNoticeProps {
  at: VariantPath;
  skipped: SkippedCopy | null;
  onDone: () => void;
  /** The variant's Copy From Ingredient, which takes the focus when the notice goes. */
  copyButton: RefObject<HTMLButtonElement | null>;
}

export interface RemoveQuestionProps {
  asked: boolean;
  question: ReactNode;
  /** Removes the row and stops asking, both in the one commit. */
  onRemove: () => void;
  /** Where the focus goes once the row and the question have gone. */
  afterRemove: () => void;
  /** Stops asking, the row kept. */
  onKeep: () => void;
}

export interface ReadFailureProps {
  error: unknown;
  onRetry: () => void;
}

import type { ReactNode } from 'react';
import type { z } from 'zod';
import type { CreateWorkspaceIngredientMutation } from '../../gql/graphql';
import type {
  INGREDIENT_ELEMENTS,
  NomenclatureKind,
} from '@/modules/ingredients/schema/ingredient-enums';
import type { LocalIngredientInput } from '@/modules/ingredients/validation/ingredient';

export interface IngredientFormProps {
  /** The coven the new ingredient is written to. */
  workspaceId: string;
  /** Called with the saved row once the server has accepted it. */
  onSaved?: (ingredient: SavedIngredient) => void;
}

export type SavedIngredient = CreateWorkspaceIngredientMutation['createWorkspaceIngredient'];

export type IngredientElement = (typeof INGREDIENT_ELEMENTS)[number];

/** One entry of a list field: `useFieldArray` keys objects, never bare strings. */
export interface ListEntry {
  value: string;
}

/**
 * One substitute: typed text, or a link to an ingredient, whose label is
 * `value` (DESIGN.md §5, `ingredient_substitutes`). Nothing here picks a
 * link yet: that is MB.131's lookup.
 */
export interface SubstituteListEntry extends ListEntry {
  /** The ingredient linked, with the formal name its pill reads beside the label. */
  link?: { id: string; canonicalName: string | null };
}

/**
 * The form's own state: every field as typed, a closed set unanswered as `''`,
 * and what sits in each list's box, not yet added.
 */
export interface IngredientFormValues {
  name: string;
  nomenclature: NomenclatureKind | '';
  canonicalName: string;
  form: string;
  folkNames: ListEntry[];
  description: string;
  element: IngredientElement | '';
  planets: ListEntry[];
  zodiacSigns: ListEntry[];
  colors: ListEntry[];
  deities: ListEntry[];
  substitutes: SubstituteListEntry[];
  safetyNotes: string;
  drafts: Record<ListFieldName, string>;
}

/** What the form sends: its values in the shape the shared schema and the mutation take, unparsed. */
export type IngredientFormInput = z.input<typeof LocalIngredientInput>;

export type TextFieldName = 'name' | 'canonicalName' | 'form' | 'description' | 'safetyNotes';

export type SelectFieldName = 'nomenclature' | 'element';

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
}

export interface SelectFieldProps extends FieldProps {
  name: SelectFieldName;
  /** Shown until a choice is made, and not itself a choice. */
  placeholder?: string;
  /** The choice that leaves the field unanswered: "None". Its value is `''`. */
  none?: string;
  options: readonly SelectOption[];
  deps?: (TextFieldName | SelectFieldName)[];
  /** Runs on a new choice, before the field and its `deps` revalidate. */
  onChange?: (value: string) => void;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface ListFieldProps {
  name: ListFieldName;
  /** The group's legend: "Folk Names". */
  legend: string;
  /** One entry, singular: the box's label, and its Add button's name, "Add Folk Name". */
  entry: string;
  /** What the list is for, behind an info tip beside the legend. */
  hint?: string;
}

export interface FieldErrorProps {
  id: string;
  message?: string;
}

export interface FieldShellProps extends FieldProps {
  controlId: string;
  hintId: string;
  noteId: string;
  errorId: string;
  error?: string;
  children: ReactNode;
}

export interface EntryChipProps {
  value: string;
  /** The list's error element, when this entry is one it names. */
  errorId?: string;
  onRemove: () => void;
}

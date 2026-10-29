import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { Resolver } from 'react-hook-form';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import type { z } from 'zod';

/**
 * Which curated vocabulary the form writes. Three are grouped: the categories, filed
 * under category groups; the ingredient forms, under form groups; and the deities, under
 * traditions. Two are flat, filed under nothing: the celestial bodies and the zodiac signs.
 */
export type GroupedValueKind = 'category' | 'form' | 'deity' | 'celestialBody' | 'zodiacSign';

/** A group the value can be filed under: the choices of the group field. */
export interface GroupedValueGroupChoice {
  id: string;
  name: string;
  /** A form group's icon name, `null` for none; absent for the other kinds. */
  icon?: FormGroupIcon | null;
}

/**
 * The fields as typed, the group `''` until one is chosen. Every kind's
 * values take this shape, whatever its input calls the group; a flat kind's
 * group stays `''` and its schema drops it.
 */
export interface GroupedValueValues {
  name: string;
  description: string;
  groupId: string;
  /**
   * A deity's other names, empty for every other kind. Under the ingredient form's `folkNames` key and
   * `drafts.folkNames`, as the field is that form's `ListField`, so the list also refuses the value's own name.
   */
  folkNames: { value: string }[];
  drafts: { folkNames: string };
}

/** The value being edited, as the form starts from it; a flat kind's has no group. */
export interface EditedGroupedValue {
  id: string;
  name: string;
  description: string;
  groupId?: string;
  /** A deity's other names, alphabetically; absent for every other kind. */
  otherNames?: readonly string[];
}

export interface GroupedValueFormProps {
  kind: GroupedValueKind;
  /** The value to edit; none adds one. */
  value?: EditedGroupedValue;
  /** Every live group of the kind, alphabetical; none for a flat kind. */
  groups?: readonly GroupedValueGroupChoice[];
  /** Called once the value is saved or deleted, and on Cancel: the owner closes it. */
  onDone: () => void;
}

/** A grouped kind's group field: what it is called, what it shows until one is chosen, and its hint. */
export interface GroupedValueGroupField {
  /** The field's label, which also names its list: "Group". */
  label: string;
  /** What the field shows until one is chosen: "Choose a group". */
  placeholder: string;
  /** What the group does for the value, behind the field's info tip. */
  hint: string;
}

/** What a kind's form says: its noun, its group field if it has one, and its confirmations. */
export interface GroupedValueCopy {
  /** One value in title case, as a button says it: "Save Category", "Delete Form". */
  noun: string;
  /**
   * What the description is for, behind its info tip: where a reader meets
   * it. Only the kinds whose suggestions match the description have one.
   */
  descriptionHint?: string;
  /** The Description's placeholder, a one-line prompt for what to write. */
  describe: string;
  /** The group field, for a grouped kind; a flat kind has none. */
  group?: GroupedValueGroupField;
  /** What the delete's confirmation says after `Delete "<name>"?`. */
  deleteNote: string;
  /** What a rename says above the actions, for a kind whose rename reaches further than its row. */
  renameNote?: string;
  /** The Other Names list's hint, for the kind that has the list: a deity. */
  otherNamesHint?: string;
  /**
   * A field's key in the kind's input, where it is not the field's own: a
   * server refusal pathed to that key lands beside the field.
   */
  inputKeys?: Partial<Record<keyof GroupedValueValues, string>>;
}

/**
 * What a kind's schema parses to: a name and a description, the group under
 * the form's own name where the kind has one, and a deity's other names. The
 * box's draft is never parsed.
 */
export type GroupedValueParsed = Pick<GroupedValueValues, 'name' | 'description'> &
  Partial<Pick<GroupedValueValues, 'groupId' | 'folkNames'>>;

/** One kind as declared: its copy, its values schema, its input, and its three mutations. */
export interface GroupedValueKindSpec<Input extends object> extends GroupedValueCopy {
  /** The shared schema the values pass before a request, its fields renamed to the form's. */
  schema: z.ZodType<GroupedValueParsed, GroupedValueParsed>;
  /** The values, as the schema leaves them, as the kind's input. */
  toInput: (values: GroupedValueValues) => Input;
  create: TypedDocumentNode<unknown, { input: Input }>;
  update: TypedDocumentNode<unknown, { id: string; input: Input }>;
  remove: TypedDocumentNode<unknown, { id: string }>;
}

/** One kind as the form uses it: its copy, its resolver, and its requests, the input type behind them. */
export interface GroupedValueFormKind extends GroupedValueCopy {
  resolver: Resolver<GroupedValueValues>;
  /** Creates the value, or updates the one at `id`. */
  save: (values: GroupedValueValues, id: string | undefined) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

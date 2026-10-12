import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { Resolver } from 'react-hook-form';
import type { z } from 'zod';

/**
 * Which curated vocabulary the form writes. Three are grouped: the
 * categories, filed under category groups; the ingredient forms, filed under
 * form groups; and the deities, filed under traditions (MB.132). Two are
 * flat, filed under nothing: the planets and the zodiac signs (MB.95).
 */
export type GroupedValueKind = 'category' | 'form' | 'deity' | 'celestialBody' | 'zodiacSign';

/** A group the value can be filed under: the choices of the group field. */
export interface GroupedValueGroupChoice {
  id: string;
  name: string;
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
}

/** The value being edited, as the form starts from it; a flat kind's has no group. */
export interface EditedGroupedValue {
  id: string;
  name: string;
  description: string;
  groupId?: string;
}

export interface GroupedValueFormProps {
  kind: GroupedValueKind;
  /** The value to edit; none adds one. */
  value?: EditedGroupedValue;
  /** Every live group of the kind, alphabetical (MB.35); none for a flat kind. */
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
  /** What the description is for, behind its info tip: where a reader meets it. */
  descriptionHint: string;
  /** The Description's placeholder, a one-line prompt for what to write. */
  describe: string;
  /** The group field, for a grouped kind; a flat kind has none. */
  group?: GroupedValueGroupField;
  /** What the delete's confirmation says after `Delete "<name>"?`. */
  deleteNote: string;
  /** What a rename says above the actions, for a kind whose rename reaches further than its row. */
  renameNote?: string;
  /**
   * A field's key in the kind's input, where it is not the field's own: a
   * server refusal pathed to that key lands beside the field.
   */
  inputKeys?: Partial<Record<keyof GroupedValueValues, string>>;
}

/**
 * What a kind's schema parses to: a name and a description, and the group
 * under the form's own name where the kind has one.
 */
export type GroupedValueParsed = Omit<GroupedValueValues, 'groupId'> &
  Partial<Pick<GroupedValueValues, 'groupId'>>;

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

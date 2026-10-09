import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { Resolver } from 'react-hook-form';
import type { z } from 'zod';

/**
 * Which grouped curated vocabulary the form writes: the categories, filed
 * under category groups; the ingredient forms, filed under form groups; or the
 * deities, filed under traditions (MB.132).
 */
export type GroupedValueKind = 'category' | 'form' | 'deity';

/** A group the value can be filed under: the choices of the group field. */
export interface GroupedValueGroupChoice {
  id: string;
  name: string;
}

/**
 * The fields as typed, the group `''` until one is chosen. Every kind's
 * values take this shape, whatever its input calls the group; `endRedirect`
 * is not one of them: it is the confirmation a refused rename asks for,
 * added to the input it is sent again with.
 */
export interface GroupedValueValues {
  name: string;
  description: string;
  groupId: string;
}

/** The value being edited, as the form starts from it. */
export interface EditedGroupedValue extends GroupedValueValues {
  id: string;
}

export interface GroupedValueFormProps {
  kind: GroupedValueKind;
  /** The value to edit; none adds one. */
  value?: EditedGroupedValue;
  /** Every live group of the kind, alphabetical (MB.35). */
  groups: readonly GroupedValueGroupChoice[];
  /** Called once the value is saved or deleted, and on Cancel: the owner closes it. */
  onDone: () => void;
}

/** What a kind's form says: its nouns, its group field's copy, and its confirmations. */
export interface GroupedValueCopy {
  /** One value in title case, as a button says it: "Save Category", "Delete Form". */
  noun: string;
  /** The group field's label, which also names its list: "Group". */
  groupLabel: string;
  /** What the group field shows until one is chosen: "Choose a group". */
  groupPlaceholder: string;
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

/** One kind as declared: its copy, its values schema, its input, and its three mutations. */
export interface GroupedValueKindSpec<Input extends object> extends GroupedValueCopy {
  /** The shared schema the values pass before a request, its fields renamed to the form's. */
  schema: z.ZodType<GroupedValueValues, GroupedValueValues>;
  /** The values, as the schema leaves them, as the kind's input. */
  toInput: (values: GroupedValueValues) => Input;
  create: TypedDocumentNode<unknown, { input: Input }>;
  update: TypedDocumentNode<unknown, { id: string; input: Input }>;
  remove: TypedDocumentNode<unknown, { id: string }>;
}

/** One kind as the form uses it: its copy, its resolver, and its requests, the input type behind them. */
export interface GroupedValueFormKind extends GroupedValueCopy {
  resolver: Resolver<GroupedValueValues>;
  /** Creates the value, or updates the one at `id`, carrying `endRedirect` once the admin confirms. */
  save: (values: GroupedValueValues, id: string | undefined, endRedirect?: true) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/**
 * A save refused until the admin confirms ending a redirect: what it said,
 * the values to send again, and the fields as they were typed, so an edit
 * withdraws it.
 */
export interface RedirectQuestion {
  message: string;
  input: GroupedValueValues;
  typed: GroupedValueValues;
}

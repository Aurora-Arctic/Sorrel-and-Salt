import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { FieldValues, Resolver } from 'react-hook-form';
import type { z } from 'zod';
import type { GroupColorColumn } from '../../lib/types';

/**
 * Which group vocabulary the form writes: the category groups, whose rows
 * carry a chip's two colours; the ingredient form groups; or the deity
 * traditions (MB.132), which carry none.
 */
export type GroupKind = 'category' | 'form' | 'tradition';

/** One group vocabulary as the form uses it: its nouns, its schema and its requests. */
export interface GroupFormKind {
  /** A group, lower-case, as a sentence says it: "group", "tradition". */
  group: string;
  /** The same in title case, as a button says it: "Save Group". */
  title: string;
  /** One row it holds, lower-case: "category". */
  one: string;
  /** More than one: "categories". */
  many: string;
  /** What the move's confirmation says the rows keep. */
  moved: string;
  /** The Description's placeholder, a one-line prompt for what to write. */
  describe: string;
  resolver: Resolver<GroupValues>;
  /** Creates the group, or updates the one at `id`. */
  save: (input: GroupValues, id: string | undefined) => Promise<void>;
  /** Deletes it, moving its rows to `moveTo` when given. */
  remove: (variables: GroupDeleteVariables) => Promise<void>;
}

/** A group's delete: the group, and where its rows go when it holds any. */
export interface GroupDeleteVariables {
  id: string;
  moveTo?: string;
}

/** One of a category group's two colour fields: the column it writes, its label and its hint. */
export interface GroupColorField {
  column: GroupColorColumn;
  label: string;
  hint: string;
}

/** What a group vocabulary's copy is: everything of `GroupFormKind` but its schema and requests. */
export type GroupKindCopy = Omit<GroupFormKind, 'resolver' | 'save' | 'remove'>;

/** One group vocabulary as declared: its copy, its shared schema, and its three mutations. */
export interface GroupKindSpec<Input extends object> extends GroupKindCopy {
  /** The shared schema the values pass before a request, whose output is the input. */
  schema: z.ZodType<object, FieldValues>;
  create: TypedDocumentNode<unknown, { input: Input }>;
  update: TypedDocumentNode<unknown, { id: string; input: Input }>;
  remove: TypedDocumentNode<unknown, { id: string; moveTo?: string | null }>;
}

/**
 * A live group, as the move picker offers it and the form names it; a
 * category group with its colours, which the pickers warn against standing
 * too close to.
 */
export interface GroupChoice {
  id: string;
  name: string;
  colorDark?: string;
  colorLight?: string;
}

/**
 * The fields as typed. A form group has no colours, so its two stay `''` and
 * its schema drops them before the request.
 */
export interface GroupValues {
  name: string;
  description: string;
  colorDark: string;
  colorLight: string;
}

/** The group being edited, as the form starts from it. */
export interface EditedGroup extends GroupValues {
  id: string;
}

export interface GroupFormProps {
  kind: GroupKind;
  /** The group to edit; none adds one. */
  group?: EditedGroup;
  /** Every live group, alphabetical (MB.35): the edited one's rows move to one of the others. */
  groups: readonly GroupChoice[];
  /** How many live rows are filed under the edited group, which a delete must move. */
  memberCount?: number;
  /** Called once the group is saved or deleted, and on Cancel: the owner closes it. */
  onDone: () => void;
}

/**
 * Where a delete stands: not begun; choosing where the group's rows go; or
 * asked to confirm, the rows' destination chosen when there are any.
 */
export type DeleteStep =
  { at: 'idle' } | { at: 'choosing' } | { at: 'confirming'; moveTo?: string };

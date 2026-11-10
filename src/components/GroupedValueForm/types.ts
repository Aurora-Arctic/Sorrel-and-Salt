import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
import type { Resolver } from 'react-hook-form';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import type { z } from 'zod';

export type GroupedValueKind = 'category' | 'form' | 'deity' | 'celestialBody' | 'zodiacSign';

export interface GroupedValueGroupChoice {
  id: string;
  name: string;
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

export interface EditedGroupedValue {
  id: string;
  name: string;
  description: string;
  groupId?: string;
  otherNames?: readonly string[];
}

export interface GroupedValueFormProps {
  kind: GroupedValueKind;
  value?: EditedGroupedValue;
  groups?: readonly GroupedValueGroupChoice[];
  onDone: () => void;
}

/** A grouped kind's group field: what it is called, what it shows until one is chosen, and its hint. */
export interface GroupedValueGroupField {
  label: string;
  /** What the field shows until one is chosen: "Choose a group". */
  placeholder: string;
  hint?: string;
}

export interface GroupedValueCopy {
  noun: string;
  descriptionHint?: string;
  group?: GroupedValueGroupField;
  deleteNote: string;
  renameNote?: string;
  otherNamesHint?: string;
  inputKeys?: Partial<Record<keyof GroupedValueValues, string>>;
}

/**
 * What a kind's schema parses to: a name and a description, the group under
 * the form's own name where the kind has one, and a deity's other names. The
 * box's draft is never parsed.
 */
export type GroupedValueParsed = Pick<GroupedValueValues, 'name' | 'description'> &
  Partial<Pick<GroupedValueValues, 'groupId' | 'folkNames'>>;

export interface GroupedValueKindSpec<Input extends object> extends GroupedValueCopy {
  schema: z.ZodType<GroupedValueParsed, GroupedValueParsed>;
  toInput: (values: GroupedValueValues) => Input;
  create: DocumentTypeDecoration<unknown, { input: Input }>;
  update: DocumentTypeDecoration<unknown, { id: string; input: Input }>;
  remove: DocumentTypeDecoration<unknown, { id: string }>;
}

export interface GroupedValueFormKind extends GroupedValueCopy {
  resolver: Resolver<GroupedValueValues>;
  save: (values: GroupedValueValues, id: string | undefined) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

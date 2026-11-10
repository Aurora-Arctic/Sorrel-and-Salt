import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
import type { FieldValues, Resolver } from 'react-hook-form';
import type { z } from 'zod';
import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';
import type { GroupColorColumn, GroupColors } from '../../lib/types';

export type GroupKind = 'category' | 'form' | 'tradition';

export interface GroupFormKind {
  moved: string;
  resolver: Resolver<GroupValues>;
  save: (input: GroupValues, id: string | undefined) => Promise<void>;
  remove: (variables: GroupDeleteVariables) => Promise<void>;
}

export interface GroupDeleteVariables {
  id: string;
  moveTo?: string;
}

export interface GroupColorField {
  column: GroupColorColumn;
  label: string;
  hint: string;
}

export type GroupKindCopy = Omit<GroupFormKind, 'resolver' | 'save' | 'remove'>;

export interface GroupKindSpec<Input extends object> extends GroupKindCopy {
  schema: z.ZodType<object, FieldValues>;
  create: DocumentTypeDecoration<unknown, { input: Input }>;
  update: DocumentTypeDecoration<unknown, { id: string; input: Input }>;
  remove: DocumentTypeDecoration<unknown, { id: string; moveTo?: string | null }>;
}

export interface GroupChoice extends Partial<GroupColors> {
  id: string;
  name: string;
  icon?: FormGroupIcon | null;
}

export interface GroupValues {
  name: string;
  description: string;
  colorDark: string;
  colorLight: string;
  icon: FormGroupIcon | '';
}

export interface EditedGroup extends GroupValues {
  id: string;
}

export interface GroupFormProps {
  kind: GroupKind;
  group?: EditedGroup;
  groups: readonly GroupChoice[];
  /** How many live rows are filed under the edited group, which a delete must move. */
  memberCount?: number;
  onDone: () => void;
}

export type DeleteStep =
  { at: 'idle' } | { at: 'choosing' } | { at: 'confirming'; moveTo?: string };

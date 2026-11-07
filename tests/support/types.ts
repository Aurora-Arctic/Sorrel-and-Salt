import type { GroupedValueKind } from '@/components/GroupedValueForm/types';
import type {
  GroupedValueGroupOption,
  GroupedValueListEntry,
} from '@/components/GroupedValueList/types';
import type { users } from '@/modules/identity/schema/users';
import type { ViteUserConfig } from 'vitest/config';
import type { ReactElement, ReactNode } from 'react';
import type { Mock } from 'vitest';

export interface Profile {
  /** The provider's own stable account id. */
  sub: string;
  /** Absent or `null`: the provider shared no address, as Discord and Facebook can. */
  email?: string | null;
  verified: boolean;
}

export type SessionUser = Pick<typeof users.$inferSelect, 'id' | 'role'>;

export type TestConfig = NonNullable<ViteUserConfig['test']>;

export interface WorkerEnv {
  DATABASE_URL?: string;
  VITEST_POOL_ID?: string;
  [key: string]: string | undefined;
}

export interface Story {
  /** The story's number in §10. 35–46 are v2 and never appear. */
  id: number;
  title: string;
}

export type StoryState = 'passed' | 'failed' | 'skipped';

export interface StoryObservation {
  storyId: number;
  state: StoryState;
  /** Failed only because it passed on a retry: a flake, which counts as failing. */
  flaky?: boolean;
  file: string;
}

export type StoryStatus = 'passed' | 'failed' | 'skipped' | 'untested';

export interface StoryEntry extends Story {
  section: string;
  status: StoryStatus;
  files: string[];
  flaky: boolean;
}

export interface UnknownStory {
  id: number;
  file: string;
}

export interface Checklist {
  stories: StoryEntry[];
  unknown: UnknownStory[];
  counts: Record<StoryStatus, number>;
  total: number;
}

export interface StoryReporterOptions {
  outputFile?: string;
}

export interface NavigatingProps {
  push: Mock;
  children: ReactNode;
  arrives?: Promise<void>;
}

export type AuthInstance = (typeof import('@/lib/auth'))['auth'];

export interface Diagnostic {
  code: string;
  filename: string;
  help?: string;
}

export interface ProbeSet {
  name: string;
  probes: ReadonlyMap<string, string>;
  directories: string[];
  files: string[];
}

export interface GroupedValue {
  id: string;
  name: string;
  description: string;
  groupId: string;
}

export interface GroupedValueFormSubject {
  kind: GroupedValueKind;
  noun: string;
  groupLabel: string;
  groups: readonly [{ id: string; name: string }, { id: string; name: string }];
  value: GroupedValue;
  create: { operation: string; data: Record<string, unknown> };
  remove: { operation: string; data: Record<string, unknown> };
  slugClash: { name: string; message: string };
}

export type GroupedValueFormCase = [
  title: string,
  run: (subject: GroupedValueFormSubject) => void | Promise<void>,
];

export interface GroupedValueListSubject {
  kind: GroupedValueKind;
  path: string;
  filterName: string;
  groupLabel: string;
  groupParam: string;
  entries: readonly [GroupedValueListEntry, GroupedValueListEntry];
  groups: readonly [GroupedValueGroupOption, GroupedValueGroupOption];
  query: string;
}

export interface CachedEntry {
  body: string;
  tags: readonly string[];
}

export interface CachedDeclaration {
  keyParts: readonly string[];
  tags: readonly string[];
  revalidate: number | false | undefined;
}

export interface TemplateBuildRegistry {
  __sorrelTemplateBuilds?: WeakMap<object, Promise<void>>;
}

export interface FilterShown {
  list: ReactElement;
  sends: string;
}

export interface FilterFormSubject {
  label: string;
  path: string;
  searchLabel: string;
  /** The search box's role when it is not a plain `searchbox`: the compendium's typeahead is a `combobox`. */
  searchRole?: 'combobox';
  push: Mock;
  none: FilterShown;
  shown: FilterShown;
  alone: readonly FilterShown[];
  searched: string;
}

export type FilterFormCase = [
  title: string,
  run: (subject: FilterFormSubject) => void | Promise<void>,
];

import type { GroupedValueKind } from '@/components/GroupedValueForm/types';
import type {
  GroupedValueGroupOption,
  GroupedValueListEntry,
} from '@/components/GroupedValueList/types';
import type { users } from '@/modules/identity/schema/users';
import type { ViteUserConfig } from 'vitest/config';
import type { ReactNode } from 'react';
import type { Mock } from 'vitest';

export interface Profile {
  /** The provider's own stable account id. */
  sub: string;
  /** Absent or `null`: the provider shared no address, as Discord and Facebook can. */
  email?: string | null;
  verified: boolean;
}

/** Any user row, not only a fixture one. */
export type SessionUser = Pick<typeof users.$inferSelect, 'id' | 'role'>;

export type TestConfig = NonNullable<ViteUserConfig['test']>;

/** `process.env` satisfies it; named so a test can pass a two-key literal. */
export interface WorkerEnv {
  DATABASE_URL?: string;
  VITEST_POOL_ID?: string;
  [key: string]: string | undefined;
}

export interface Story {
  /** The story's number in §10. 35–46 are v2 and never appear. */
  id: number;
  /** The story's wording in §10, verbatim. */
  title: string;
}

export type SuiteState = 'passed' | 'failed' | 'skipped' | 'pending';

/** The little of Vitest's TestSuite the checklist reads. */
export interface ReportedSuite {
  readonly name: string;
  state(): SuiteState;
}

/** The little of Vitest's TestModule the checklist reads. */
export interface ReportedModule {
  readonly relativeModuleId: string;
  readonly children: { allSuites(): Iterable<ReportedSuite> };
}

export type StoryStatus = 'passed' | 'failed' | 'skipped' | 'untested';

export interface StoryEntry extends Story {
  status: StoryStatus;
  /** Every module holding a suite that names this story. */
  suites: string[];
}

export interface UnknownSuite {
  /** A number §10 does not list — a v2 story, or a typo. */
  id: number;
  name: string;
  module: string;
}

export interface Checklist {
  stories: StoryEntry[];
  unknown: UnknownSuite[];
  counts: Record<StoryStatus, number>;
  total: number;
}

export interface StoryReporterOptions {
  /** Where to write the checklist as JSON; relative paths resolve against the root. */
  outputFile?: string;
}

/** What `Navigating` takes: the mocked router's `push`, and what it wraps. */
export interface NavigatingProps {
  push: Mock;
  children: ReactNode;
}

/** The Better Auth instance `@/lib/auth` exports, as `importAuth` hands it back. */
export type AuthInstance = (typeof import('@/lib/auth'))['auth'];

/** One entry of oxlint's `--format json` report, as the lint guards read it. */
export interface Diagnostic {
  code: string;
  filename: string;
  help?: string;
}

/**
 * One lint guard's probes: the deliberate violations and the committed files
 * the `unit` project's setup lints in one run (tests/support/lint-probes/).
 */
export interface ProbeSet {
  /** The guard's name, for the setup's own failure messages. */
  name: string;
  /** Probe files by repo-relative path, each with the source written there. */
  probes: ReadonlyMap<string, string>;
  /** The throwaway directories the probes land in, removed once linted. */
  directories: string[];
  /** Committed files linted beside the probes, for an exemption the guard asserts. */
  files: string[];
}

/** A grouped curated value as its form edits it: a category, an ingredient form. */
export interface GroupedValue {
  id: string;
  name: string;
  description: string;
  groupId: string;
}

/**
 * One kind of the grouped-value form, as the tests its kinds share drive it
 * (tests/support/grouped-value-form.tsx).
 */
export interface GroupedValueFormSubject {
  kind: GroupedValueKind;
  /** What Save, Saving and Delete name: `Category`, `Form`. */
  noun: string;
  /** The group field's label, which also names its list: `Group`. */
  groupLabel: string;
  /** The schema's refusal of a blank description. */
  describeRefusal: string;
  /** The schema's refusal of an unchosen group. */
  groupRefusal: string;
  /** The two groups it is rendered with, in the picker's order. */
  groups: readonly [{ id: string; name: string }, { id: string; name: string }];
  /** The value an edit starts from, filed under the second group. */
  value: GroupedValue;
  /** The create mutation's operation, and a successful answer to it. */
  create: { operation: string; data: Record<string, unknown> };
  /** The delete mutation's operation, and a successful answer to it. */
  remove: { operation: string; data: Record<string, unknown> };
  /** A name the server refuses for the address it would take, and the refusal. */
  slugClash: { name: string; message: string };
}

/** A shared test: its title, and what it does to a subject. */
export type GroupedValueFormCase = [
  title: string,
  run: (subject: GroupedValueFormSubject) => void | Promise<void>,
];

/**
 * One kind of the grouped-value list, as tests/components/GroupedValueList
 * drives every kind through the same rows.
 */
export interface GroupedValueListSubject {
  kind: GroupedValueKind;
  /** The page the list is on, which its links and its filter address: `/admin/categories`. */
  path: string;
  /** The filter form's name: `Filter categories`. */
  filterName: string;
  /** The group column's heading and the filter's label: `Group`. */
  groupLabel: string;
  /** The address parameter the filter names a group by: `group`. */
  groupParam: string;
  /** The group filter's first option: `All groups`. */
  allGroups: string;
  /** What an unfiltered empty list says: `No categories yet.`. */
  noneYet: string;
  /** What a filtered empty list says: `No category matches.`. */
  noMatch: string;
  /** Two rows as the page hands them over. */
  entries: readonly [GroupedValueListEntry, GroupedValueListEntry];
  /** Two live groups, alphabetical, as the filter offers them. */
  groups: readonly [GroupedValueGroupOption, GroupedValueGroupOption];
  /** Part of a name, as the filter's query. */
  query: string;
}

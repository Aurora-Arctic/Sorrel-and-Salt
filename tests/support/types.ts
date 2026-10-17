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

export type StoryState = 'passed' | 'failed' | 'skipped';

/** One test's verdict on one story, as the reporter reads it from a `@story-N` tag. */
export interface StoryObservation {
  storyId: number;
  state: StoryState;
  /** Failed only because it passed on a retry: a flake, which counts as failing. */
  flaky?: boolean;
  /** The spec holding the test, repo-relative. */
  file: string;
}

export type StoryStatus = 'passed' | 'failed' | 'skipped' | 'untested';

export interface StoryEntry extends Story {
  status: StoryStatus;
  /** Every spec holding a test tagged with this story. */
  files: string[];
  /** Every failure was a pass-on-retry. */
  flaky: boolean;
}

/** A tag `@story-N` naming a number §10 does not list — a v2 story, or a typo. */
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
  /** Where to write the checklist as JSON; relative paths resolve against the root. */
  outputFile?: string;
}

/**
 * What `Navigating` takes: the mocked router's `push`, what it wraps, and
 * when the server's render arrives, by default never.
 */
export interface NavigatingProps {
  push: Mock;
  children: ReactNode;
  arrives?: Promise<void>;
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

/** One kind of the grouped-value form, as its shared tests drive it (tests/support/grouped-value-form.tsx). */
export interface GroupedValueFormSubject {
  kind: GroupedValueKind;
  /** What Save, Saving and Delete name: `Category`, `Form`. */
  noun: string;
  /** The group field's label, which also names its list: `Group`. */
  groupLabel: string;
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

/** One kind of the grouped-value list, as tests/components/GroupedValueList drives it. */
export interface GroupedValueListSubject {
  kind: GroupedValueKind;
  /** The page the list is on, which its links and its filter address: `/admin/categories`. */
  path: string;
  /** The filter form's name: `Filter categories`. */
  filterName: string;
  /** The group filter's label: `Group`. */
  groupLabel: string;
  /** The address parameter the filter names a group by: `group`. */
  groupParam: string;
  /** Two rows as the page hands them over. */
  entries: readonly [GroupedValueListEntry, GroupedValueListEntry];
  /** Two live groups, alphabetical, as the filter offers them. */
  groups: readonly [GroupedValueGroupOption, GroupedValueGroupOption];
  /** Part of a name, as the filter's query. */
  query: string;
}

/** An entry of tests/support/next-data-cache.ts: the stored JSON and its tags. */
export interface CachedEntry {
  body: string;
  tags: readonly string[];
}

/** What an `unstable_cache` read was declared with, as the fake data cache keeps it. */
export interface CachedDeclaration {
  keyParts: readonly string[];
  tags: readonly string[];
  revalidate: number | false | undefined;
}

/**
 * `globalThis` as db-global-setup.ts extends it: the template build each run's
 * Vitest instance started, so the second project naming the setup awaits the
 * first's rather than starting its own.
 */
export interface TemplateBuildRegistry {
  __sorrelTemplateBuilds?: WeakMap<object, Promise<void>>;
}

/** A list rendered under one filter, and what its filter form sends for it, as a native submit would. */
export interface FilterShown {
  /** The list, as its page renders it under the filter. */
  list: ReactElement;
  /** The form's fields as an address query, in the row's order: `query=bo&role=&awaiting=`. */
  sends: string;
}

/** One list's filter, as tests/support/filter-form.tsx drives it. */
export interface FilterFormSubject {
  /** The form's accessible name: `Filter Users`. */
  label: string;
  /** The page itself, which the form submits to and Clear opens: `/admin/users`. */
  path: string;
  /** The search box's label: `Name or Email`. */
  searchLabel: string;
  /** The search box's role when it is not a plain `searchbox`: the compendium's typeahead is a `combobox`. */
  searchRole?: 'combobox';
  /** The mocked router's `push`, which every filter applies through. */
  push: Mock;
  /** The list showing no filter. */
  none: FilterShown;
  /** The list showing every part of its filter. */
  shown: FilterShown;
  /** The list showing each part of its filter alone, each drawing Clear. */
  alone: readonly FilterShown[];
  /** Where the search opens with ` Two words ` typed over `shown`. */
  searched: string;
}

/** A shared filter test: its title, and what it does to a subject. */
export type FilterFormCase = [
  title: string,
  run: (subject: FilterFormSubject) => void | Promise<void>,
];

import type { users } from '@/modules/identity/schema/users';
import type { ViteUserConfig } from 'vitest/config';

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

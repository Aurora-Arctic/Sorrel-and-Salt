import { V1_STORIES, parseStoryHeading } from './stories';
import type { Story } from './stories';

// One entry per v1 story in §10 order, whether or not anything tested it — a
// story with no test yet is a line on the report, not an omission. Every suite
// at any depth naming a story counts, so a story may be tested from two files.

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

/**
 * A failure anywhere fails the story; a skip anywhere leaves it not fully
 * verified; `pending`, what an interrupted run leaves, must never read as green.
 */
function statusOf(states: SuiteState[]): StoryStatus {
  if (states.length === 0) return 'untested';
  if (states.some((state) => state === 'failed' || state === 'pending')) return 'failed';
  if (states.some((state) => state === 'skipped')) return 'skipped';
  return 'passed';
}

export function buildChecklist(
  modules: Iterable<ReportedModule>,
  stories: readonly Story[] = V1_STORIES,
): Checklist {
  const known = new Set(stories.map((story) => story.id));
  const states = new Map<number, SuiteState[]>();
  const suites = new Map<number, string[]>();
  const unknown: UnknownSuite[] = [];

  for (const module of modules) {
    for (const suite of module.children.allSuites()) {
      const heading = parseStoryHeading(suite.name);
      if (!heading) continue;
      if (!known.has(heading.id)) {
        unknown.push({ id: heading.id, name: suite.name, module: module.relativeModuleId });
        continue;
      }
      states.set(heading.id, [...(states.get(heading.id) ?? []), suite.state()]);
      const seen = suites.get(heading.id) ?? [];
      if (!seen.includes(module.relativeModuleId)) {
        suites.set(heading.id, [...seen, module.relativeModuleId]);
      }
    }
  }

  const entries = stories.map((story) => ({
    ...story,
    status: statusOf(states.get(story.id) ?? []),
    suites: suites.get(story.id) ?? [],
  }));

  const counts: Record<StoryStatus, number> = { passed: 0, failed: 0, skipped: 0, untested: 0 };
  for (const entry of entries) counts[entry.status] += 1;

  return { stories: entries, unknown, counts, total: entries.length };
}

const SUFFIX: Record<StoryStatus, string> = {
  passed: '',
  failed: ' — FAILING',
  skipped: ' — skipped',
  untested: ' — no test yet',
};

/** The one-line tally: zero parts are left out, except the passing count. */
export function summarizeChecklist({ counts, total }: Checklist): string {
  const parts = [`${counts.passed} of ${total} stories passing`];
  if (counts.failed) parts.push(`${counts.failed} failing`);
  if (counts.skipped) parts.push(`${counts.skipped} skipped`);
  if (counts.untested) parts.push(`${counts.untested} without a test`);
  return parts.join(' · ');
}

/** The checklist as terminal text: a box per story, the strays, the tally. */
export function formatChecklist(checklist: Checklist): string {
  const lines = checklist.stories.map(
    ({ id, title, status }) =>
      `[${status === 'passed' ? 'x' : ' '}] Story ${id}: ${title}${SUFFIX[status]}`,
  );
  if (checklist.unknown.length > 0) {
    lines.push('');
    for (const { name, module } of checklist.unknown) {
      lines.push(`Not a v1 story: "${name}" in ${module}`);
    }
  }
  lines.push('', summarizeChecklist(checklist));
  return lines.join('\n');
}

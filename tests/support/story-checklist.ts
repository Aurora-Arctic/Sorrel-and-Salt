import { scanBrowserFlows } from './browser-flows';
import { V1_STORIES, parseStoryHeading } from './stories';
import type {
  BrowserFlows,
  SuiteState,
  ReportedModule,
  StoryStatus,
  UnknownSuite,
  Checklist,
  Story,
} from './types';

// One entry per v1 story in §10 order, whether or not anything tested it — a
// story with no test yet is a line on the report, not an omission. Every suite
// at any depth naming a story counts, so a story may be tested from two files.
// A story's browser flows, the e2e specs tagged `@story-N`, are traced beside
// its status and never change it: the acceptance suite stays the definition of
// done.

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
  flows: BrowserFlows = scanBrowserFlows(stories),
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
    browser: [...(flows.byStory.get(story.id) ?? [])],
  }));

  const counts: Record<StoryStatus, number> = { passed: 0, failed: 0, skipped: 0, untested: 0 };
  for (const entry of entries) counts[entry.status] += 1;
  const browserFlows = entries.filter((entry) => entry.browser.length > 0).length;

  return {
    stories: entries,
    unknown,
    unknownTags: flows.unknown,
    counts,
    browserFlows,
    total: entries.length,
  };
}

const SUFFIX: Record<StoryStatus, string> = {
  passed: '',
  failed: ' — FAILING',
  skipped: ' — skipped',
  untested: ' — no test yet',
};

/** The one-line tally: zero parts are left out, except the passing count. */
export function summarizeChecklist({ counts, browserFlows, total }: Checklist): string {
  const parts = [`${counts.passed} of ${total} stories passing`];
  if (counts.failed) parts.push(`${counts.failed} failing`);
  if (counts.skipped) parts.push(`${counts.skipped} skipped`);
  if (counts.untested) parts.push(`${counts.untested} without a test`);
  if (browserFlows) parts.push(`${browserFlows} with a browser flow`);
  return parts.join(' · ');
}

/** The checklist as terminal text: a box per story, the strays, the tally. */
export function formatChecklist(checklist: Checklist): string {
  const lines = checklist.stories.map(({ id, title, status, browser }) => {
    const box = status === 'passed' ? 'x' : ' ';
    const flow = browser.length > 0 ? ' · browser' : '';
    return `[${box}] Story ${id}: ${title}${SUFFIX[status]}${flow}`;
  });
  if (checklist.unknown.length > 0 || checklist.unknownTags.length > 0) {
    lines.push('');
    for (const { name, module } of checklist.unknown) {
      lines.push(`Not a v1 story: "${name}" in ${module}`);
    }
    for (const { id, file } of checklist.unknownTags) {
      lines.push(`Not a v1 story: @story-${id} in ${file}`);
    }
  }
  lines.push('', summarizeChecklist(checklist));
  return lines.join('\n');
}

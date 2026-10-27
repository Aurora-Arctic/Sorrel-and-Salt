import { STORY_SECTIONS } from './story-sections';
import { V1_STORIES } from './stories';
import type {
  Checklist,
  Story,
  StoryEntry,
  StoryObservation,
  StoryState,
  StoryStatus,
  UnknownStory,
} from './types';

// One entry per v1 story in §10 order, whether or not anything tested it — a
// story with no test yet is a line on the report, not an omission. Every test
// tagged `@story-N` counts, so a story may be walked from two files.

/** A failure anywhere fails the story; a skip anywhere leaves it not fully verified. */
export function statusOf(states: StoryState[]): StoryStatus {
  if (states.length === 0) return 'untested';
  if (states.some((state) => state === 'failed')) return 'failed';
  if (states.some((state) => state === 'skipped')) return 'skipped';
  return 'passed';
}

export function buildChecklist(
  observations: Iterable<StoryObservation>,
  stories: readonly Story[] = V1_STORIES,
): Checklist {
  const known = new Set(stories.map((story) => story.id));
  const seen = new Map<number, StoryObservation[]>();
  const unknown: UnknownStory[] = [];

  for (const observation of observations) {
    if (!known.has(observation.storyId)) {
      unknown.push({ id: observation.storyId, file: observation.file });
      continue;
    }
    seen.set(observation.storyId, [...(seen.get(observation.storyId) ?? []), observation]);
  }

  const entries = stories.map((story) => {
    const own = seen.get(story.id) ?? [];
    const failures = own.filter((observation) => observation.state === 'failed');
    return {
      ...story,
      section: STORY_SECTIONS[story.id] ?? 'Other',
      status: statusOf(own.map((observation) => observation.state)),
      files: [...new Set(own.map((observation) => observation.file))],
      // Every failure was a pass-on-retry: the story works, but not reliably.
      flaky: failures.length > 0 && failures.every((observation) => observation.flaky === true),
    };
  });

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

/** The stories under their section, sections in name order and stories in §10 order. */
export function groupBySection(entries: readonly StoryEntry[]): Array<[string, StoryEntry[]]> {
  const groups = new Map<string, StoryEntry[]>();
  for (const entry of entries)
    groups.set(entry.section, [...(groups.get(entry.section) ?? []), entry]);
  return [...groups].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/** The checklist as terminal text: a heading per section, a box per story, the strays, the tally. */
export function formatChecklist(checklist: Checklist): string {
  const lines: string[] = [];
  for (const [section, entries] of groupBySection(checklist.stories)) {
    if (lines.length > 0) lines.push('');
    lines.push(section);
    for (const { id, title, status, flaky } of entries) {
      const box = status === 'passed' ? 'x' : ' ';
      const suffix =
        status === 'failed' && flaky ? ' — FLAKY (failed, then passed on retry)' : SUFFIX[status];
      lines.push(`  [${box}] Story ${id}: ${title}${suffix}`);
    }
  }
  if (checklist.unknown.length > 0) {
    lines.push('');
    for (const { id, file } of checklist.unknown) {
      lines.push(`Not a v1 story: @story-${id} in ${file}`);
    }
  }
  lines.push('', summarizeChecklist(checklist));
  return lines.join('\n');
}

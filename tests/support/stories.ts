import { readFileSync } from 'node:fs';
import { fromRoot } from './paths';

// The v1 user stories, parsed out of DESIGN.md §10 rather than copied: a second
// list here would drift without a test failing. stories.test.ts pins what the
// parse must find.

export interface Story {
  /** The story's number in §10. 35–46 are v2 and never appear. */
  id: number;
  /** The story's wording in §10, verbatim. */
  title: string;
}

const SECTION_HEADING = /^## 10\. User stories\s*$/m;
const NEXT_SECTION = /^## \d+\./m;
const STORY_LINE = /^(\d+)\. (.+?)\s*$/;

/** The numbered items between the §10 heading and the next `## n.` heading. */
export function parseStories(design: string): Story[] {
  const heading = SECTION_HEADING.exec(design);
  if (!heading) {
    throw new Error('DESIGN.md has no "## 10. User stories" section to read the stories from');
  }
  const body = design.slice(heading.index + heading[0].length);
  const end = NEXT_SECTION.exec(body);
  const section = end ? body.slice(0, end.index) : body;

  return section
    .split('\n')
    .map((line) => STORY_LINE.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({ id: Number(match[1]), title: match[2] }));
}

/**
 * `Story 12: …` split into id and title; anything else, including a lower-case
 * `story` or a missing colon, answers `undefined`.
 */
export function parseStoryHeading(name: string): Story | undefined {
  const match = /^Story (\d+): (.+)$/.exec(name);
  return match ? { id: Number(match[1]), title: match[2] } : undefined;
}

/** "1–34, 47–57": the ids as runs, for a message that should not go stale. */
export function describeRanges(ids: readonly number[]): string {
  const runs: Array<[number, number]> = [];
  for (const id of ids) {
    const last = runs[runs.length - 1];
    if (last && last[1] === id - 1) {
      last[1] = id;
    } else {
      runs.push([id, id]);
    }
  }
  return runs.map(([from, to]) => (from === to ? `${from}` : `${from}–${to}`)).join(', ');
}

export const V1_STORIES: readonly Story[] = parseStories(
  readFileSync(fromRoot('claude-docs/DESIGN.md'), 'utf8'),
);

export const V1_STORY_IDS: readonly number[] = V1_STORIES.map((story) => story.id);

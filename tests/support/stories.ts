import { readFileSync } from 'node:fs';
import { fromRoot } from './paths';

// M1.28 — the v1 user stories, read out of DESIGN.md §10.
//
// The checklist `make test-stories` prints has one line per story, and the
// stories are written down exactly once: as the numbered list under
// "## 10. User stories". A second list here — 45 ids and titles in a
// constant — would drift from that one without a test failing, the way a
// second copy of the fixture ids would (as-user.ts). So the spec is the
// source and this file is the parse; stories.test.ts pins what the parse
// must find, so a §10 rewording that empties it fails loudly.

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
 * A describe name written the way §11's example writes it —
 * `Story 12: a viewer reads everything and writes nothing` — split into its
 * id and title. Anything else, including a lower-case `story` or a missing
 * colon, is not a citation and answers `undefined`.
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

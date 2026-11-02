import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Story } from './types';

// The v1 user stories, parsed out of DESIGN.md §10 rather than copied. The path starts from the working
// directory: Playwright loads its reporters as CommonJS, where `import.meta` does not exist.

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

export const V1_STORIES: readonly Story[] = parseStories(
  readFileSync(resolve(process.cwd(), 'claude-docs/DESIGN.md'), 'utf8'),
);

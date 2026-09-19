import { V1_STORY_IDS, describeRanges, parseStoryHeading } from './stories';

// M1.28 — what tests/guards/story-naming.test.ts asks of an acceptance file.
//
// A static read of the source, not a run: a block at column 0 is top-level,
// and a top-level block is either a describe citing a v1 story or a
// violation. Nested describes are free to be named anything — grouping
// inside a story is the author's business — and a test inside a story
// describe carries the story by position. What this cannot see is a
// describe whose name is built at runtime; that is not how §11's example
// writes them, and the checklist would show such a story as untested.

const TOP_LEVEL_DESCRIBE = /^describe(?:\.\w+)*\(\s*(['"`])(.*?)\1/;
const TOP_LEVEL_TEST = /^(?:it|test)(?:\.\w+)*\(\s*(['"`])(.*?)\1/;

const known = new Set(V1_STORY_IDS);

/** One line per violation, empty when the file conforms. */
export function storyNamingViolations(source: string): string[] {
  const violations: string[] = [];
  source.split('\n').forEach((line, index) => {
    const at = `line ${index + 1}`;
    const suite = TOP_LEVEL_DESCRIBE.exec(line);
    if (suite) {
      const name = suite[2];
      const heading = parseStoryHeading(name);
      if (!heading) {
        violations.push(
          `${at}: top-level describe '${name}' does not name a story — expected 'Story <id>: …'`,
        );
      } else if (!known.has(heading.id)) {
        violations.push(
          `${at}: '${name}' is not a v1 story — DESIGN.md §10 numbers ${describeRanges(V1_STORY_IDS)}`,
        );
      }
      return;
    }
    const test = TOP_LEVEL_TEST.exec(line);
    if (test) {
      violations.push(`${at}: test '${test[2]}' sits outside a story describe`);
    }
  });
  return violations;
}

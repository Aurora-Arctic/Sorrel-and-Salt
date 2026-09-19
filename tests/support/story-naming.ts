import { V1_STORY_IDS, describeRanges, parseStoryHeading } from './stories';

// What tests/guards/story-naming.test.ts asks of an acceptance file, as a
// static read: a block at column 0 is top-level and must be a describe citing
// a v1 story. Nested describes may be named anything. A describe name built at
// runtime is invisible here and shows in the checklist as untested.

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

import { describe, expect, it } from 'vitest';
import { storyNamingViolations } from './story-naming';

// The static half of story traceability: what the guard asks of each top-level block.

describe('storyNamingViolations', () => {
  it('accepts a file whose top-level describes each name a v1 story', () => {
    const source = [
      "import { describe, it } from 'vitest';",
      '',
      "describe('Story 12: a viewer reads everything and writes nothing', () => {",
      "  it('lets a viewer read the workspace grimoire', () => {});",
      "  describe('nested helpers are fine', () => {",
      "    it('does not need a story of its own', () => {});",
      '  });',
      '});',
      '',
      "describe.skip('Story 13: see who last edited a stock item', () => {});",
      '',
      'describe("Story 57: a one-off ingredient", () => {});',
      '',
      'describe(`Story 1: sign in`, () => {});',
    ].join('\n');

    expect(storyNamingViolations(source)).toEqual([]);
  });

  it('names a top-level describe that cites no story', () => {
    const source = ["describe('spells service', () => {});"].join('\n');

    expect(storyNamingViolations(source)).toEqual([
      `line 1: top-level describe 'spells service' does not name a story — expected 'Story <id>: …'`,
    ]);
  });

  it('names a top-level describe citing a number that is not a v1 story', () => {
    const source = ["describe('Story 40: a notes story', () => {});"].join('\n');

    expect(storyNamingViolations(source)).toEqual([
      `line 1: 'Story 40: a notes story' is not a v1 story — DESIGN.md §10 numbers 1–34, 47–62`,
    ]);
  });

  it('names a test written outside any describe', () => {
    const source = ['', "it('floats free', () => {});", "test.only('also free', () => {});"].join(
      '\n',
    );

    expect(storyNamingViolations(source)).toEqual([
      `line 2: test 'floats free' sits outside a story describe`,
      `line 3: test 'also free' sits outside a story describe`,
    ]);
  });
});

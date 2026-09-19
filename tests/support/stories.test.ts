import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from './paths';
import { V1_STORIES, V1_STORY_IDS, parseStories, parseStoryHeading } from './stories';

// The list is read out of DESIGN.md §10; these pin what the parse must find,
// so a §10 rewording that empties it fails here.

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('V1_STORIES', () => {
  it('reads the v1 stories out of DESIGN.md §10 — 1–34 and 47–57 today, never 35–46', () => {
    // Pinned by rule rather than frozen: a story added to §10 joins without a
    // harness edit, and 35–46 are not reused.
    expect(V1_STORY_IDS).toEqual([...V1_STORY_IDS].sort((a, b) => a - b));
    expect(new Set(V1_STORY_IDS).size).toBe(V1_STORY_IDS.length);
    expect(V1_STORY_IDS.filter((id) => id >= 35 && id <= 46)).toEqual([]);
    expect(V1_STORY_IDS).toEqual(expect.arrayContaining([...range(1, 34), ...range(47, 57)]));
  });

  it('agrees with the count §10 states for itself', () => {
    // §10 says "a v1 count is 45 stories" in prose; a story added without
    // that sentence moving is the drift this catches.
    const design = readFileSync(fromRoot('claude-docs/DESIGN.md'), 'utf8');
    const stated = design.match(/v1 count is (\d+) stories/);
    expect(stated).not.toBeNull();
    expect(V1_STORIES).toHaveLength(Number(stated?.[1]));
  });

  it('carries each story under its own number with its §10 wording', () => {
    expect(V1_STORIES[0]).toEqual({
      id: 1,
      title: "Sign in with Google or GitHub, so I don't manage another password.",
    });
    expect(V1_STORIES.find((story) => story.id === 57)?.title).toMatch(
      /^Add a one-off ingredient by name and form/,
    );
  });
});

describe('parseStories', () => {
  it('takes only the numbered items between the §10 heading and the next section', () => {
    const design = [
      '## 9. Something else',
      '1. Not a story.',
      '## 10. User stories',
      '### Accounts',
      '1. First story.',
      '',
      'Prose between groups is not a story either.',
      '### Grimoire',
      '47. A later story.',
      '## 11. TDD approach',
      '2. Not a story.',
    ].join('\n');

    expect(parseStories(design)).toEqual([
      { id: 1, title: 'First story.' },
      { id: 47, title: 'A later story.' },
    ]);
  });

  it('refuses a document with no §10 rather than returning an empty checklist', () => {
    expect(() => parseStories('# Nothing here')).toThrow(/§10|User stories/);
  });
});

describe('parseStoryHeading', () => {
  it('reads the id and title out of a describe name written the way §11 shows', () => {
    expect(parseStoryHeading('Story 12: a viewer reads everything and writes nothing')).toEqual({
      id: 12,
      title: 'a viewer reads everything and writes nothing',
    });
  });

  it('answers undefined for a describe that names no story', () => {
    expect(parseStoryHeading('spells service')).toBeUndefined();
    // The colon is the delimiter — without it the number could be anything.
    expect(parseStoryHeading('Story 12 a viewer reads')).toBeUndefined();
    // Spelled as §10 spells it; a heading is a citation, not prose.
    expect(parseStoryHeading('story 12: lower-case')).toBeUndefined();
    expect(parseStoryHeading('Stories 12: plural')).toBeUndefined();
  });
});

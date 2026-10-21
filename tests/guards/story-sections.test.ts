import { describe, expect, it } from 'vitest';

import { STORY_SECTIONS } from '../support/story-sections';
import { V1_STORY_IDS } from '../support/stories';

describe('story sections', () => {
  it('names a section for every v1 story and for nothing else', () => {
    const named = Object.keys(STORY_SECTIONS).map(Number);
    expect(named.sort((a, b) => a - b)).toEqual([...V1_STORY_IDS]);
  });
});

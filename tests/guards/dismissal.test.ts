import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// A popover that closes on an outside press or Escape goes through `useDismiss`
// (src/lib/use-dismiss.ts), so the phase, the event and the focus return cannot drift between
// components. The files below listen for a pointer press for another job and say so here.

const OUTSIDE_PRESS = /addEventListener\(\s*'(pointerdown|mousedown)'/;
const OTHER_JOBS: Record<string, string> = {
  'src/components/Field/pointer-held.ts': 'tracks a held pointer for a field, closes nothing',
  'src/components/SpellBuilder/steps/index.tsx':
    'pairs a press with its release to tell a drag from a click',
  'src/components/ClickFeedback/index.tsx':
    'closes on focus leaving as well, in the anchor’s own document',
};

describe('outside-press dismissal', () => {
  it('has no hand-written pointerdown or mousedown listener in a component outside the exempt files', () => {
    const files = inject('repoFiles').filter((file) => /^src\/components\/.*\.tsx?$/.test(file));

    // Precondition: the scan reached the components and the exempt files still exist.
    expect(files.length).toBeGreaterThan(50);
    for (const exempt of Object.keys(OTHER_JOBS)) expect(files).toContain(exempt);

    const offending = files
      .filter((file) => !(file in OTHER_JOBS))
      .filter((file) => OUTSIDE_PRESS.test(readFileSync(file, 'utf8')));
    expect(offending).toEqual([]);
  });
});

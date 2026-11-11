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

// Escape is compared in one place too: `useDismiss`'s `onEscape` for a listener on the document,
// and `escapeKeyHandler` for an element's own `onKeyDown`, both in src/lib/use-dismiss.ts. The
// files below read the key for a job that is not closing a popover of their own.

const ESCAPE_KEY = /(['"`])Esc(ape)?\1/;
const DISMISSAL_HOME = 'src/lib/use-dismiss.ts';
const OTHER_ESCAPES: Record<string, string> = {
  'src/components/ClickFeedback/index.tsx':
    'listens in the anchor’s own document, beside its press and focus listeners',
  'src/components/Combobox/escape.ts':
    'marks an open list’s Escape handled for the dialog around it; Downshift closes the list',
  'src/components/Combobox/index.tsx':
    'decides whether Escape on a closed list is Downshift’s, the empty row’s or the dialog’s',
};

describe('Escape dismissal', () => {
  it('has no hand-written Escape handler or listener in src/ outside src/lib/use-dismiss.ts and the exempt files', () => {
    const files = inject('repoFiles').filter((file) => /^src\/.*\.tsx?$/.test(file));

    // Precondition: the scan reached the home and the exempt files, and the pattern sees the home's
    // own comparison, so an empty result means no other file compares the key.
    expect(files).toContain(DISMISSAL_HOME);
    for (const exempt of Object.keys(OTHER_ESCAPES)) expect(files).toContain(exempt);
    expect(ESCAPE_KEY.test(readFileSync(DISMISSAL_HOME, 'utf8'))).toBe(true);

    const offending = files
      .filter((file) => file !== DISMISSAL_HOME && !(file in OTHER_ESCAPES))
      .filter((file) => ESCAPE_KEY.test(readFileSync(file, 'utf8')));
    expect(offending).toEqual([]);
  });

  it('offers an element-level Escape handler beside the document listener', () => {
    expect(readFileSync(DISMISSAL_HOME, 'utf8')).toMatch(/export function escapeKeyHandler\b/);
  });
});

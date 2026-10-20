import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

import { fromRoot } from '../support/paths';

// M8.17's guard (claude-docs/design-decisions/m8.17-plan.md, "Giving the
// focus back"): a modal gives the focus back to what opened it however it
// closes, and the mechanism is Modal's own (`modal.tsx`), with RouteModal's
// fallbacks beside it (`route-modal.tsx`). An owner names where the focus goes
// when its opener is gone through `returnTo`, and focuses nothing itself, so a
// later dialog that builds its own return by hand fails here, in its own diff.
//
// What is scanned: every file that draws a dialog — a `<Modal>`, a
// `<RouteModal>`, a native `<dialog>` or a `showModal()` — and every file of
// Modal's own directory, comments left out. A `.focus()` in one is a hand-built
// return until this list says otherwise. The list is counted by call, and a
// count that no longer matches fails too, so it can only shrink.

const MECHANISM = ['src/components/Modal/modal.tsx', 'src/components/Modal/route-modal.tsx'];
const DRAWS_A_DIALOG = /<(?:Modal|RouteModal|dialog)\b|\.showModal\(/;
const FOCUS_CALL = /\.focus\(/g;
const COMMENTS = /\/\*[\s\S]*?\*\/|(^|[^:'"`])\/\/.*$/gm;

/** File to the number of `.focus()` calls it may hold, with why. */
const ALLOWED: Record<string, { calls: number; reason: string }> = {
  'src/components/FacetPanel/index.tsx': {
    calls: 2,
    reason:
      'the Filters panel is a dialog of its own, not a Modal, open beside the page from the tablet width up: it gives the focus back to its button only when the focus was inside it',
  },
  'src/components/Modal/confirm-overlay.tsx': {
    calls: 5,
    reason:
      'a question over a modal body, not a modal: it takes the focus to its safe answer and gives it back to the field the question interrupted, inside the modal that stays open',
  },
  'src/components/UserList/confirmed-action.tsx': {
    calls: 1,
    reason:
      'the focus going in, not back: the question puts it on the confirm, which the warning describes, as the modal opens',
  },
};

function focusCalls(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const file of inject('repoFiles')) {
    if (!/^src\/.*\.tsx?$/.test(file) || /\.stories\.tsx$/.test(file)) continue;
    if (MECHANISM.includes(file)) continue;
    const code = readFileSync(fromRoot(file), 'utf8').replace(COMMENTS, '$1');
    if (!DRAWS_A_DIALOG.test(code) && !file.startsWith('src/components/Modal/')) continue;
    const found = code.match(FOCUS_CALL)?.length ?? 0;
    if (found > 0) counts.set(file, found);
  }
  return counts;
}

describe('M8.17: a modal gives the focus back through one mechanism', () => {
  const found = focusCalls();

  it('finds the dialogs it scans, so a clean result is not a blind scan', () => {
    expect(found.get('src/components/FacetPanel/index.tsx')).toBeGreaterThan(0);
    expect(found.get('src/components/Modal/confirm-overlay.tsx')).toBeGreaterThan(0);
  });

  it('reads a comment as no call, so a dialog named in prose is not one', () => {
    const sample = '// the <dialog> here\nconst a = 1; /* b.focus() */ c.focus();';
    const code = sample.replace(COMMENTS, '$1');
    expect(DRAWS_A_DIALOG.test(code)).toBe(false);
    expect(code.match(FOCUS_CALL)).toHaveLength(1);
  });

  it('holds no hand-built focus return beside a dialog', () => {
    const extra = [...found]
      .filter(([file, calls]) => calls > (ALLOWED[file]?.calls ?? 0))
      .map(([file, calls]) => `${file}: ${calls} calls, ${ALLOWED[file]?.calls ?? 0} allowed`);
    expect(extra).toEqual([]);
  });

  it('lists no allowance that no longer matches a call', () => {
    const stale = Object.entries(ALLOWED)
      .filter(([file, { calls }]) => (found.get(file) ?? 0) < calls)
      .map(([file, { calls }]) => `${file}: ${found.get(file) ?? 0} calls, ${calls} listed`);
    expect(stale).toEqual([]);
  });
});

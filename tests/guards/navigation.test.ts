import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

import { fromRoot } from '../support/paths';

// M12.33's guard (claude-docs/design-decisions/m12.33-plan.md): the site
// navigates through `usePendingNavigation` or `PendingLink`, so the page bar
// and the skeletons follow every move. A bare `router.push`, `replace` or
// `refresh` moves the page with no signal, so a later task that adds one
// fails here, in its own diff. Next's `<Link>` is not covered.
//
// The baseline is the offenders, counted by call, and it is empty: every
// call moved onto the hook. A file that must keep one lists it here with
// why; a count that no longer matches fails too, so the list can only shrink.

const ROUTER_CALL = /\b\w*[rR]outer\.(?:push|replace|refresh)\b/g;
const MECHANISM = 'src/lib/navigation/';

/** File to the number of bare router calls it may still hold, with why. */
const BASELINE: Record<string, { calls: number; reason: string }> = {};

function bareCalls(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const file of inject('repoFiles')) {
    if (!/^src\/.*\.tsx?$/.test(file) || file.startsWith(MECHANISM)) continue;
    const found = readFileSync(fromRoot(file), 'utf8').match(ROUTER_CALL)?.length ?? 0;
    if (found > 0) counts.set(file, found);
  }
  return counts;
}

describe('M12.33: the site navigates through one mechanism', () => {
  const found = bareCalls();

  it('recognises a bare router call, so a clean result is not a blind scan', () => {
    const sample = 'router.push(a); router.replace(b); router.refresh(); appRouter.push(c);';
    expect(sample.match(ROUTER_CALL)).toHaveLength(4);
  });

  it('holds no bare router call beyond the baseline', () => {
    const extra = [...found]
      .filter(([file, calls]) => calls > (BASELINE[file]?.calls ?? 0))
      .map(([file, calls]) => `${file}: ${calls} calls, ${BASELINE[file]?.calls ?? 0} allowed`);
    expect(extra).toEqual([]);
  });

  it('lists no baseline entry that no longer matches a call', () => {
    const stale = Object.entries(BASELINE)
      .filter(([file, { calls }]) => (found.get(file) ?? 0) < calls)
      .map(([file, { calls }]) => `${file}: ${found.get(file) ?? 0} calls, ${calls} listed`);
    expect(stale).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';

import { readEntry } from '../../scripts/tasks-md.mjs';

// The title `sync` gives an issue is `readEntry`'s, read off the entry's
// heading. The board's title rule (.claude/rules/task-tracking.md, "Board
// layout") has a live task titled as its heading reads, and a retired one
// `<ID> — [RETIRED] <title>`: the heading's strike-through is markdown, which
// an issue title shows as literal tildes. MB.120: sync wrote M12.49's title
// as `M12.49 — ~~Move …~~`.

const LIVE = '**M12.37 — Playwright Runs Under Claude Code Print Dots and Failures** · 1.5h';
const RETIRED =
  "**M12.49 — ~~Move IngredientForm's Fields Into Generic Field Components~~** · **RETIRED 2026-10-20, not done**";
const entries = [LIVE, '', 'Live body.', '', RETIRED, '', 'Retired body.'].join('\n');

describe("the issue title an entry's heading gives", () => {
  it('is the heading as written for a live task', () => {
    const entry = readEntry(entries, 'M12.37');
    expect(entry?.hours).toBe(1.5);
    expect(entry?.title).toBe('M12.37 — Playwright Runs Under Claude Code Print Dots and Failures');
  });

  it('is `<ID> — [RETIRED] <title>` for a retired task, with the strike-through dropped', () => {
    const entry = readEntry(entries, 'M12.49');
    // Precondition: the heading was read as retired, the case the rule covers.
    expect(entry?.hours).toBeUndefined();
    expect(entry?.title).toBe(
      "M12.49 — [RETIRED] Move IngredientForm's Fields Into Generic Field Components",
    );
  });
});

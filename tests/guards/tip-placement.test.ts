import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { fromRoot } from '../support/paths';

// Every tip positions itself on open and stays on screen (M8.14, amended
// 2026-10-18), through Floating UI in `useTip`. A component that opens a tip
// must hand the hook's `anchor` and `bubble` refs and `bubbleStyle` to its
// markup, and a stylesheet must not pin a bubble with a fixed `$align`.
//
// It reads source text, so it proves the wiring is written, not that the
// bubble lands on screen; the gate spec in tests/e2e/tip-placement.spec.ts
// measures that. A component that builds its own tip without `useTip` or
// `role="tooltip"` is not seen.

/** Files still on the old pinned tip, each removed from here by its owner's PR. */
const PENDING = new Set([
  'src/components/EntryMarks/tip-mark.tsx',
  'src/components/EntryMarks/index.scss',
  'src/components/IngredientCard/index.scss',
]);

function walk(dir: string): string[] {
  return readdirSync(fromRoot(dir), { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    return e.isDirectory() ? walk(path) : [path];
  });
}

const files = walk('src/components');
const tsx = files.filter((f) => f.endsWith('.tsx') && !f.endsWith('.stories.tsx'));
const scss = files.filter((f) => f.endsWith('.scss'));

const OPENS_A_TIP = /useTip\(|role="tooltip"/;
const FIXED_ALIGN = /tip-above\(([^)]*\$align|\s*[^)$]*,[^)]*,)/;

describe('tip placement', () => {
  it('finds the components and stylesheets it scans', () => {
    expect(
      tsx.filter((f) => OPENS_A_TIP.test(readFileSync(fromRoot(f), 'utf8'))).length,
    ).toBeGreaterThan(8);
    expect(
      scss.filter((f) => /tip-above/.test(readFileSync(fromRoot(f), 'utf8'))).length,
    ).toBeGreaterThan(5);
  });

  it('gives every component that opens a tip the hook’s refs and style', () => {
    const bare = tsx.filter((f) => {
      if (PENDING.has(f) || f === 'src/components/InfoTip/use-tip.ts') return false;
      const text = readFileSync(fromRoot(f), 'utf8');
      if (!OPENS_A_TIP.test(text)) return false;
      return !(/\banchor\b/.test(text) && /\bbubbleStyle\b/.test(text) && /\bbubble\b/.test(text));
    });
    expect(bare).toEqual([]);
  });

  it('pins no tip with a fixed align', () => {
    const pinned = scss.filter(
      (f) => !PENDING.has(f) && FIXED_ALIGN.test(readFileSync(fromRoot(f), 'utf8')),
    );
    expect(pinned).toEqual([]);
  });

  it('still catches a pinned tip', () => {
    expect(FIXED_ALIGN.test('@include tip-above($align: end);')).toBe(true);
    expect(FIXED_ALIGN.test('@include tip-above(1, false, end);')).toBe(true);
    expect(FIXED_ALIGN.test('@include tip-above($tip-layer, false);')).toBe(false);
    expect(FIXED_ALIGN.test('@include tip-above;')).toBe(false);
  });

  it('keeps PENDING to files that exist and still need it', () => {
    for (const f of PENDING) {
      const text = readFileSync(fromRoot(f), 'utf8');
      expect(OPENS_A_TIP.test(text) || FIXED_ALIGN.test(text)).toBe(true);
    }
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// A hover tip is drawn by `TipAnchor` (src/components/InfoTip/tip-anchor.tsx), which owns the
// anchor's show and hide handlers and the bubble's attributes, so a fix to a tip reaches every one.
// Only the InfoTip folder calls `useTip` itself. The file below is a second tip primitive.

const CALLS_USE_TIP = /\buseTip\(/;
const TIP_HOME = /^src\/components\/InfoTip\//;
const OTHER_PRIMITIVES: Record<string, string> = {
  'src/components/IconTip/icon-tip.tsx':
    'mounts its bubble only while open, with its own fade and timing, around any control',
};

describe('hover tips', () => {
  it('call useTip only inside src/components/InfoTip/ and the exempt primitive', () => {
    const files = inject('repoFiles').filter((file) => /^src\/.*\.tsx?$/.test(file));

    // Precondition: the scan reached the hook and the exempt primitive, and the hook's own folder
    // still calls it, so an empty result means no other file does.
    expect(files).toContain('src/components/InfoTip/use-tip.ts');
    for (const exempt of Object.keys(OTHER_PRIMITIVES)) expect(files).toContain(exempt);
    expect(
      files
        .filter((file) => TIP_HOME.test(file))
        .some((file) => CALLS_USE_TIP.test(readFileSync(file, 'utf8'))),
    ).toBe(true);

    const offending = files
      .filter((file) => !TIP_HOME.test(file) && !(file in OTHER_PRIMITIVES))
      .filter((file) => CALLS_USE_TIP.test(readFileSync(file, 'utf8')));
    expect(offending).toEqual([]);
  });
});

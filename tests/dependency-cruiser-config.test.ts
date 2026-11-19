import { describe, expect, it } from 'vitest';

import { CONFIG, runCruise } from '../scripts/review-affected.mjs';

// The review graph's parser is swc, which stops the whole cruise on syntax it does not know, and
// TypeScript's own parser finds nothing here without a warning. A file that swc rejects therefore
// fails this test rather than leaving `npm run review:affected` broken.

describe('the dependency-cruiser config', () => {
  it('parses every module under src/', { timeout: 120_000 }, () => {
    const result = runCruise(['src', '--config', CONFIG, '--output-type', 'json']);
    const sources = result.modules.map(({ source }) => source);

    // Preconditions: the cruise reached the tree, its TSX, and the `@/` alias.
    expect(result.summary.totalCruised).toBeGreaterThan(2000);
    expect(sources.some((source) => source.endsWith('.tsx'))).toBe(true);
    expect(
      result.modules.some(({ dependencies }) =>
        dependencies.some(
          ({ module, resolved }) => module.startsWith('@/') && resolved.startsWith('src/'),
        ),
      ),
    ).toBe(true);
    expect(result.summary.error).toBe(0);
  });
});

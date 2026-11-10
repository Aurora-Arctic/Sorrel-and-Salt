import { readFileSync } from 'node:fs';
import { describe, expect, it, inject } from 'vitest';

// Whether motion is turned down is asked in one place, `prefersReducedMotion` in src/lib/motion.ts, with
// one answer for a browser that cannot be asked. A second inline query lets the answers drift apart
// (claude-docs/components/modal.md, "The fade").

const SCRIPT = /^src\/.*\.(ts|tsx)$/;
const HOME = 'src/lib/motion.ts';
const INLINE_QUERY = /prefers-reduced-motion/;

describe('the reduced-motion query', () => {
  it('is written only in src/lib/motion.ts among the scripts of src/', () => {
    const files = inject('repoFiles').filter((file) => SCRIPT.test(file));

    // Precondition: the scan reached the home file and the components that ask through it.
    expect(files).toContain(HOME);
    expect(files).toContain('src/components/Modal/modal.tsx');

    const offending = files
      .filter((file) => file !== HOME)
      .filter((file) => INLINE_QUERY.test(readFileSync(file, 'utf8')));
    expect(offending).toEqual([]);
  });

  it('is written in the home file', () => {
    expect(INLINE_QUERY.test(readFileSync(HOME, 'utf8'))).toBe(true);
  });
});
